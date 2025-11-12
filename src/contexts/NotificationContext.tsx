'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { setNotificationTrigger } from '@/lib/reminderNotifications';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'chat' | 'reminder';
  teamId?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification if permission is granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Set up team chat realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('team-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages'
        },
        (payload) => {
          const message = payload.new;
          
          // Don't show notification for own messages
          if (message.user_id === user.id) return;
          
          // Get team name from localStorage or fetch it
          let teamName = 'your team';
          try {
            const storedTeams = localStorage.getItem('teams');
            if (storedTeams) {
              const teams = JSON.parse(storedTeams);
              const team = teams.find((t: any) => t.id === message.team_id);
              if (team) {
                teamName = team.name;
              }
            }
          } catch (e) {
            console.error('Error getting team name:', e);
          }
          
          addNotification({
            title: `New message in ${teamName}`,
            message: message.message,
            type: 'chat',
            teamId: message.team_id
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addNotification]);

  // Set up the notification trigger for reminder service
  useEffect(() => {
    setNotificationTrigger((title: string, body: string) => {
      addNotification({
        title,
        message: body,
        type: 'reminder'
      });
    });
  }, [addNotification]);

  // Set up reminder checking
  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      try {
        const { data: reminders, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .eq('notification_sent', false);

        if (error) {
          console.error('Error fetching reminders:', error);
          return;
        }

        const now = new Date();
        
        for (const reminder of reminders || []) {
          const dueDate = new Date(reminder.due_date);
          const diff = dueDate.getTime() - now.getTime();
          
          // Check if reminder is due within 10 minutes (600000 ms)
          if (diff <= 600000 && diff > 0) {
            addNotification({
              title: `Reminder (${reminder.reminder_type})`,
              message: reminder.title,
              type: 'reminder'
            });
            
            // Mark notification as sent to prevent duplicates
            await supabase
              .from('reminders')
              .update({ notification_sent: true })
              .eq('id', reminder.id);
          }
        }
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    // Check immediately
    checkReminders();
    
    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    
    return () => clearInterval(interval);
  }, [user, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
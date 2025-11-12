'use client';

import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { X, MessageSquare, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationToast() {
  const { notifications, markAsRead } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<typeof notifications>([]);
  const router = useRouter();

  // Show only the most recent unread notification
  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length > 0) {
      setVisibleNotifications([unread[0]]);
    } else {
      setVisibleNotifications([]);
    }
  }, [notifications]);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    
    if (notification.type === 'chat' && notification.teamId) {
      router.push(`/team/chat?team=${notification.teamId}`);
    } else if (notification.type === 'reminder') {
      router.push('/reminders');
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 max-w-sm animate-fade-in-up"
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {notification.type === 'chat' ? (
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">{notification.title}</h4>
                <p className="text-slate-300 text-xs mt-1">{notification.message}</p>
                <p className="text-slate-500 text-xs mt-2">
                  {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notification.id);
              }}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
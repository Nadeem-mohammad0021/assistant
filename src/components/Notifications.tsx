'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { MessageSquare, Bell, Clock, Trash2 } from 'lucide-react';

export function Notifications() {
  const { user } = useAuth();
  const { notifications, markAsRead, clearNotifications } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    
    // Find the notification to get its type and teamId
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      if (notification.type === 'chat' && notification.teamId) {
        // Redirect to team chat page
        window.location.href = `/team/chat?team=${notification.teamId}`;
      } else if (notification.type === 'reminder') {
        // Redirect to reminders page
        const event = new CustomEvent('navigateToView', { detail: 'reminders' });
        window.dispatchEvent(event);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-cyan-500/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications Access Required</h1>
          <p className="text-slate-400 mb-8">
            Please sign in to view your notifications and stay updated with your team.
          </p>
          <button
            onClick={() => {
              // Dispatch event to navigate to auth view
              const event = new CustomEvent('navigateToView', { detail: 'auth' });
              window.dispatchEvent(event);
            }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-3 md:pt-4 max-w-full pt-20 md:pt-0">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
          <p className="text-slate-400 text-sm">Stay updated with your team messages and reminders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-1 font-medium ${
              activeTab === 'all'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`pb-3 px-1 font-medium ${
              activeTab === 'unread'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Clear All Button */}
        {notifications.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={clearNotifications}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-slate-400">
                {activeTab === 'unread' 
                  ? 'You\'re all caught up! All notifications have been read.'
                  : 'Notifications will appear here when you receive new messages or reminders.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  notification.read 
                    ? 'bg-slate-800/50 border-slate-700' 
                    : 'bg-slate-700/50 border-cyan-500/30'
                }`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {notification.type === 'chat' ? (
                      <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white">{notification.title}</h3>
                    <p className="text-slate-300 text-sm mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-500 text-xs">
                        {notification.createdAt.toLocaleDateString()} at {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="w-3 h-3 bg-cyan-500 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { X, MessageSquare, Bell, Clock } from 'lucide-react';

export function NotificationCenter() {
  const { notifications, markAsRead, clearNotifications } = useNotifications();

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Notifications</h2>
          <button 
            onClick={clearNotifications}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    notification.read 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-slate-700/50 border-cyan-500/30'
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
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
                    <div className="flex-1">
                      <h3 className="font-medium text-white text-sm">{notification.title}</h3>
                      <p className="text-slate-300 text-xs mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 text-xs">
                          {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={clearNotifications}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
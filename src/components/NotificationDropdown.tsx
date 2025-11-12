'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, MessageSquare, X, Clock } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-cyan-500/10 text-cyan-400 text-xs px-2 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-slate-700/30' : ''
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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm truncate">{notification.title}</h4>
                        <p className="text-slate-300 text-xs mt-1 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-1 mt-2">
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
            <div className="p-3 border-t border-slate-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Here you would typically open the full notification center
                  // For now, we'll just close the dropdown
                }}
                className="w-full py-2 text-center text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
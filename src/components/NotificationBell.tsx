'use client';

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <Bell className="w-5 h-5 text-slate-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}
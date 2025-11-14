'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, BookOpen, Bell, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalNotes: number;
  totalReminders: number;
  upcomingReminders: number;
  completedReminders: number;
}

interface RecentActivity {
  type: 'conversation' | 'note' | 'reminder';
  title: string;
  timestamp: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    totalMessages: 0,
    totalNotes: 0,
    totalReminders: 0,
    upcomingReminders: 0,
    completedReminders: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    // Cache key based on user ID and timestamp (15 minute intervals)
    const cacheKey = `dashboard_${user.id}_${Math.floor(Date.now() / (15 * 60 * 1000))}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      setStats(parsed.stats);
      setRecentActivity(parsed.recentActivity);
      setLoading(false);
      return;
    }

    // Fetch conversations with limit
    const { data: conversationsRaw, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .limit(50);
    const conversations = conversationsRaw ?? [];

    // Fetch messages
    let totalMessages = 0;
    if (conversations.length > 0) {
      const convIds = conversations.map(c => c.id);
      const { data: messagesRaw } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds);
      const messages = messagesRaw ?? [];
      totalMessages = messages.length;
    }

    // Fetch notes
    const { data: notesRaw, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);
    const notes = notesRaw ?? [];

    // Fetch reminders
    const { data: remindersRaw, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id);
    const reminders = remindersRaw ?? [];

    const now = new Date();
    const upcoming = reminders.filter((r) => !r.is_completed && new Date(r.due_date) >= now);
    const completed = reminders.filter((r) => r.is_completed);

    setStats({
      totalConversations: conversations.length,
      totalMessages: totalMessages,
      totalNotes: notes.length,
      totalReminders: reminders.length,
      upcomingReminders: upcoming.length,
      completedReminders: completed.length,
    });

    const activities: RecentActivity[] = [];
    // Add recent conversations
    conversations.slice(0, 2).forEach((conv) => {
      activities.push({
        type: 'conversation',
        title: conv.title,
        timestamp: conv.updated_at,
      });
    });
    // Add recent notes
    notes.slice(0, 2).forEach((note) => {
      activities.push({
        type: 'note',
        title: note.title,
        timestamp: note.updated_at,
      });
    });
    // Add recent reminders
    reminders.slice(0, 2).forEach((reminder) => {
      activities.push({
        type: 'reminder',
        title: reminder.title,
        timestamp: reminder.created_at,
      });
    });
    // Sort by timestamp and limit to 6 items
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 6));
    setLoading(false);
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const StatCard = ({ icon: Icon, label, value, color, onClick }: any) => (
    <div 
      className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`bg-${color}-500/10 p-3 rounded-xl`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-full pt-20 md:pt-0">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Welcome back!</h1>
          <p className="text-slate-400 text-base">Here's what's happening with your KYNEX.dev workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div onClick={() => {
            // Navigate to chat view
            const event = new CustomEvent('navigateToView', { detail: 'chat' });
            window.dispatchEvent(event);
          }}>
            <StatCard icon={MessageSquare} label="Conversations" value={stats.totalConversations} color="cyan" />
          </div>
          <div onClick={() => {
            // Navigate to chat view
            const event = new CustomEvent('navigateToView', { detail: 'chat' });
            window.dispatchEvent(event);
          }}>
            <StatCard icon={TrendingUp} label="Total Messages" value={stats.totalMessages} color="blue" />
          </div>
          <div onClick={() => {
            // Navigate to notes view
            const event = new CustomEvent('navigateToView', { detail: 'notes' });
            window.dispatchEvent(event);
          }}>
            <StatCard icon={BookOpen} label="Notes" value={stats.totalNotes} color="green" />
          </div>
          <div onClick={() => {
            // Navigate to reminders view
            const event = new CustomEvent('navigateToView', { detail: 'reminders' });
            window.dispatchEvent(event);
          }}>
            <StatCard icon={Bell} label="Total Reminders" value={stats.totalReminders} color="yellow" />
          </div>
          <div onClick={() => {
            // Navigate to reminders view
            const event = new CustomEvent('navigateToView', { detail: 'reminders' });
            window.dispatchEvent(event);
          }}>
            <StatCard icon={Calendar} label="Upcoming" value={stats.upcomingReminders} color="orange" />
          </div>
          <div onClick={() => {
            // Navigate to reminders view
            const event = new CustomEvent('navigateToView', { detail: 'reminders' });
            window.dispatchEvent(event);
          }}>
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.completedReminders}
              color="emerald"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Average messages per conversation</span>
                <span className="text-white font-semibold">
                  {stats.totalConversations > 0
                    ? Math.round(stats.totalMessages / stats.totalConversations)
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Reminder completion rate</span>
                <span className="text-white font-semibold">
                  {stats.totalReminders > 0
                    ? Math.round((stats.completedReminders / stats.totalReminders) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Total activities</span>
                <span className="text-white font-semibold">
                  {stats.totalConversations + stats.totalNotes + stats.totalReminders}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => {
                      // Navigate to the appropriate view based on activity type
                      if (activity.type === 'conversation') {
                        const event = new CustomEvent('navigateToView', { detail: 'chat' });
                        window.dispatchEvent(event);
                      } else if (activity.type === 'note') {
                        const event = new CustomEvent('navigateToView', { detail: 'notes' });
                        window.dispatchEvent(event);
                      } else if (activity.type === 'reminder') {
                        const event = new CustomEvent('navigateToView', { detail: 'reminders' });
                        window.dispatchEvent(event);
                      }
                    }}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.type === 'conversation'
                          ? 'bg-cyan-500/10'
                          : activity.type === 'note'
                          ? 'bg-green-500/10'
                          : 'bg-yellow-500/10'
                      }`}
                    >
                      {activity.type === 'conversation' && (
                        <MessageSquare className="w-5 h-5 text-cyan-400" />
                      )}
                      {activity.type === 'note' && <BookOpen className="w-5 h-5 text-green-400" />}
                      {activity.type === 'reminder' && <Bell className="w-5 h-5 text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{activity.title}</p>
                      <p className="text-sm text-slate-400">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} •{' '}
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent activity yet</p>
                <p className="text-sm text-slate-500 mt-1">Start chatting, creating notes, or setting reminders</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-2">Your AI Memory is Active</h3>
          <p className="text-slate-300">
            KYNEX.dev is continuously learning from your conversations, notes, and reminders. Everything you share is
            stored in long-term memory, allowing for contextual and intelligent assistance across all your
            activities.
          </p>
        </div>
      </div>
    </div>
  );
}
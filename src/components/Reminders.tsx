"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Check, Calendar, Clock, Briefcase, Home, RefreshCw, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { sendReminderNotification } from '../lib/email';
import { sharedTimer } from '../lib/sharedTimer';

interface Reminder {
  id: string;
  title: string;
  description: string;
  reminder_type: 'personal' | 'professional';
  due_date: string;
  is_completed: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
}

export function Reminders() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'professional'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'personal' as 'personal' | 'professional',
    due_date: '',
    is_recurring: false,
    recurrence_rule: 'daily',
    send_email_notification: true,
  });

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Convert local datetime-local value to an ISO UTC string
      const dueIso = (() => {
        try {
          const d = new Date(formData.due_date);
          if (isNaN(d.getTime())) return null;
          return d.toISOString();
        } catch (e) {
          return null;
        }
      })();

      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          reminder_type: formData.reminder_type,
          due_date: dueIso ?? formData.due_date,
          is_completed: false,
          is_recurring: formData.is_recurring,
          recurrence_rule: formData.is_recurring ? formData.recurrence_rule : null,
        });

      if (error) throw error;

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        reminder_type: 'personal',
        due_date: '',
        is_recurring: false,
        recurrence_rule: 'daily',
        send_email_notification: true,
      });
      setShowModal(false);

      // Refresh reminders list
      await loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      setError('Failed to create reminder');
    }
  };

  useEffect(() => {
    const cleanup = sharedTimer.subscribe(setCurrentTime);
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (user) {
      loadReminders();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadReminders = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      setReminders(data || []);
      setError(null);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setError('Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const diffMs = date.getTime() - currentTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [currentTime]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      const typeMatch = filterType === 'all' || reminder.reminder_type === filterType;
      const completedMatch = showCompleted || !reminder.is_completed;
      return typeMatch && completedMatch;
    });
  }, [reminders, filterType, showCompleted]);

  const upcomingReminders = useMemo(() => 
    filteredReminders.filter((r) => !r.is_completed && new Date(r.due_date) >= currentTime),
    [filteredReminders, currentTime]
  );

  const overdueReminders = useMemo(() => 
    filteredReminders.filter((r) => !r.is_completed && new Date(r.due_date) < currentTime),
    [filteredReminders, currentTime]
  );

  const completedReminders = useMemo(() => 
    filteredReminders.filter((r) => r.is_completed),
    [filteredReminders]
  );

  const toggleComplete = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          is_completed: !reminder.is_completed,
          completed_at: !reminder.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', reminder.id);
      
      if (error) throw error;
      await loadReminders();
    } catch (error) {
      console.error('Error toggling reminder completion:', error);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setReminders(reminders.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  // Small live countdown component to show remaining time until due date
  const DueCountdown = React.memo(({ dueDate }: { dueDate: string }) => {
    const due = new Date(dueDate).getTime();
    if (isNaN(due)) return <span className="text-rose-400">Invalid date</span>;
    const diffMs = due - currentTime.getTime();
    if (diffMs <= 0) return <span className="inline-block bg-rose-900/10 text-rose-300 px-2 py-0.5 rounded-md text-xs font-medium">Due now</span>;

    const seconds = Math.floor(diffMs / 1000) % 60;
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
    const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
    if (days === 0 && hours === 0) parts.push(`${seconds}s`);

    return <span className="inline-block bg-slate-800/50 text-slate-300 px-2 py-0.5 rounded-md text-xs font-medium">in {parts.join(' ')}</span>;
  });

  const ReminderCard = React.memo(({ reminder }: { reminder: Reminder }) => (
    <div
      className={`bg-slate-800 rounded-lg p-4 border transition-all ${
        reminder.is_completed
          ? 'border-slate-700 opacity-60'
          : new Date(reminder.due_date) < currentTime
          ? 'border-red-500/50'
          : 'border-slate-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleComplete(reminder)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            reminder.is_completed
              ? 'bg-green-500 border-green-500'
              : 'border-slate-600 hover:border-cyan-500'
          }`}
        >
          {reminder.is_completed && <Check className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3
              className={`font-semibold ${
                reminder.is_completed ? 'text-slate-500 line-through' : 'text-white'
              }`}
            >
              {reminder.title}
            </h3>
            <button
              onClick={() => deleteReminder(reminder.id)}
              className="text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {reminder.description && (
            <p className="text-sm text-slate-400 mb-3">{reminder.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                reminder.reminder_type === 'professional'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-green-500/10 text-green-400'
              }`}
            >
              {reminder.reminder_type === 'professional' ? (
                <Briefcase className="w-3 h-3" />
              ) : (
                <Home className="w-3 h-3" />
              )}
              {reminder.reminder_type}
            </span>

            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3" />
              {formatDate(reminder.due_date)}
            </span>

            <span className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(reminder.due_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <DueCountdown dueDate={reminder.due_date} />
            </span>

            {reminder.is_recurring && (
              <span className="flex items-center gap-1 text-cyan-400">
                <RefreshCw className="w-3 h-3" />
                {reminder.recurrence_rule}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="min-h-screen p-3 md:p-4 max-w-full pt-20 md:pt-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Reminders</h1>
            <p className="text-slate-400 text-sm">Stay organized with smart reminders</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Reminder
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('personal')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filterType === 'personal'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Personal
            </button>
            <button
              onClick={() => setFilterType('professional')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filterType === 'professional'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Professional
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showCompleted"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="showCompleted" className="text-slate-300">
              Show completed
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-700 rounded w-full mb-2" />
                <div className="h-3 bg-slate-700 rounded w-5/6 mt-4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {overdueReminders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-400" />
                  Overdue
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overdueReminders.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {upcomingReminders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingReminders.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {showCompleted && completedReminders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Completed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedReminders.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </div>
            )}

            {filteredReminders.length === 0 && (
              <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
                <div className="bg-cyan-500/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No reminders yet</h3>
                <p className="text-slate-400 mb-6">
                  Create your first reminder to stay organized and never miss important tasks.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create Reminder
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Create Reminder</h2>
            <form onSubmit={createReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Reminder title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  placeholder="Description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.reminder_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reminder_type: e.target.value as 'personal' | 'professional',
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.is_recurring}
                  onChange={(e) =>
                    setFormData({ ...formData, is_recurring: e.target.checked })
                  }
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="isRecurring" className="text-slate-300">
                  Recurring reminder
                </label>
              </div>

              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Recurrence
                  </label>
                  <select
                    value={formData.recurrence_rule}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_rule: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              {userProfile?.preferences?.email_notifications ? (
                <div className="text-sm text-slate-400 pt-2">
                  Email notification will be sent automatically at the due date.
                </div>
              ) : (
                <div className="text-sm text-slate-400 pt-2">
                  Enable email notifications in settings to receive email alerts at due dates.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Create Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reminders;
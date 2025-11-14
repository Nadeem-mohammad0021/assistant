'use client';

import { useState, useEffect } from 'react';
import { User as UserIcon, Shield, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Profile {
  full_name: string;
  preferences: {
    notifications_enabled: boolean;
    email_notifications: boolean;
    browser_notifications: boolean;
    theme: string;
  };
}

export function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    preferences: {
      notifications_enabled: true,
      email_notifications: false,
      browser_notifications: true,
      theme: 'dark',
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        // Ensure preferences object has all required fields
        const preferences = {
          notifications_enabled: existingProfile.preferences?.notifications_enabled ?? true,
          email_notifications: existingProfile.preferences?.email_notifications ?? false,
          browser_notifications: existingProfile.preferences?.browser_notifications ?? true,
          theme: existingProfile.preferences?.theme ?? 'dark',
        };
        
        setProfile({
          full_name: existingProfile.full_name || '',
          preferences,
        });
      } else {
        // No profile found - initialize with default values
        const defaultPreferences = {
          notifications_enabled: true,
          email_notifications: false,
          browser_notifications: true,
          theme: 'dark',
        };
        
        // Create a new profile with default values
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: '',
            email: user.email || '',
            preferences: defaultPreferences,
          })
          .select();
        
        if (createError) throw createError;
        
        setProfile({
          full_name: '',
          preferences: defaultPreferences,
        });
      }
      
      setInitialLoad(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load profile';
      console.error('Error loading profile:', message);
      setError(message);
      setProfile({
        full_name: '',
        preferences: {
          notifications_enabled: true,
          email_notifications: false,
          browser_notifications: true,
          theme: 'dark',
        },
      });
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage('');

    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: profile.full_name,
            preferences: profile.preferences,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: profile.full_name,
            email: user.email || '',
            preferences: profile.preferences,
          });

        if (createError) throw createError;
      }

      setSaveMessage('Settings saved successfully!');
      // Refresh the profile data after saving
      await loadProfile();
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      // Safely access error message
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as any).message 
        : 'Unknown error occurred';
      setSaveMessage('Failed to save settings: ' + errorMessage);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-4 max-w-full pt-20 md:pt-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-slate-400 mb-6 text-sm">Manage your account and preferences</p>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-2 rounded-lg">
                <UserIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Profile Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Profile Name</label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Your profile name"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">Enable Notifications</h3>
                  <p className="text-sm text-slate-400">Receive notifications for reminders and team messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications_enabled}
                    onChange={(e) => setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        notifications_enabled: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">Email Notifications</h3>
                  <p className="text-sm text-slate-400">Receive email notifications for reminders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.preferences.email_notifications}
                    onChange={(e) => setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        email_notifications: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">Browser Notifications</h3>
                  <p className="text-sm text-slate-400">Show desktop notifications for reminders and team messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.preferences.browser_notifications}
                    onChange={(e) => setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        browser_notifications: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">About Kynex</h2>
            </div>

            <div className="space-y-3 text-slate-300">
              <p>
                KYNEX.dev is your personal AI workspace with long-term memory. It helps you manage conversations,
                notes, and reminders all in one place.
              </p>
              <div className="pt-4 border-t border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Version</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className={`rounded-lg p-4 ${saveMessage.includes('Failed') ? 'bg-red-500/10 border border-red-500/50' : 'bg-green-500/10 border border-green-500/50'}`}>
              <p className={`text-center ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{saveMessage}</p>
            </div>
          )}

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
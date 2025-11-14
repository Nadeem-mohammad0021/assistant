'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Brain, MessageSquare, BookOpen, Bell, Settings, LogOut, Menu, X, Home, User, HelpCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

interface LayoutProps {
  children: ReactNode;
  activeView: 'dashboard' | 'chat' | 'notes' | 'reminders' | 'settings' | 'help' | 'team' | 'notifications';
  onViewChange: (view: 'dashboard' | 'chat' | 'notes' | 'reminders' | 'settings' | 'help' | 'team' | 'notifications') => void;
}

interface Profile {
  full_name: string;
  preferences?: {
    email_notifications: boolean;
  };
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { signOut, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      // Reminder notification service is started in AuthContext, so we don't need to start it here
    }
  }, [user]);

  // Listen for profile updates from Settings component
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedProfile = event.detail;
      setProfile(updatedProfile);
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load profile';
      console.error('Error loading profile:', message);
      setError(message);
      setProfile(null); // Reset profile on error
    }
  };

  const navigation = [
    { id: 'dashboard' as const, name: 'Dashboard', icon: Home },
    { id: 'chat' as const, name: 'Chat', icon: MessageSquare },
    { id: 'notes' as const, name: 'Notes', icon: BookOpen },
    { id: 'reminders' as const, name: 'Reminders', icon: Bell },
    { id: 'team' as const, name: 'Team', icon: Users },
    { id: 'settings' as const, name: 'Settings', icon: Settings },
    { id: 'help' as const, name: 'Help', icon: HelpCircle },
  ];

  return (
    <div className="w-screen max-w-full bg-slate-900 flex overflow-hidden">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-0 bg-slate-800/80 backdrop-blur-sm border-r border-slate-700 z-20">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
            {/* Make the logo clickable */}
            <a href="/" className="flex items-center gap-3">
              <Logo size="lg" showImage={true} />
            </a>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Notification Bell for Desktop - Always visible */}
          <div className="px-4 py-2 flex items-center justify-center">
            <button 
              onClick={() => onViewChange('notifications')}
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
          </div>

          <div className="px-4 py-4 border-t border-slate-700">
            {/* Profile section in sidebar */}
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center relative">
                <User className="w-5 h-5 text-cyan-400" />
                {profile?.preferences?.email_notifications && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {profile?.full_name || user?.email || 'User'}
                </p>
                <p className="text-slate-400 text-sm truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 pt-20 md:pt-0 max-w-full">
        {/* Mobile header - visible only on small screens */}
        <header className="md:hidden fixed top-0 left-0 w-full z-30 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Make the mobile logo clickable */}
              <a href="/" className="flex items-center gap-2 flex-shrink-0">
                <Logo size="lg" showImage={true} />
              </a>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Notification Bell for Mobile - Always visible */}
              <button 
                onClick={() => onViewChange('notifications')}
                className="relative p-1 text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 text-white text-[8px] rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>
              
              {/* Profile icon for mobile */}
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-cyan-400" />
              </div>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="mt-4 pb-2 space-y-1 relative z-50">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-base ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all text-base"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          )}
        </header>

        <main className="flex flex-col bg-slate-900 max-w-full overflow-y-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
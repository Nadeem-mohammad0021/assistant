'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Auth } from '@/components/Auth';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { Chat } from '@/components/Chat';
import { Notes } from '@/components/Notes';
import { Reminders } from '@/components/Reminders';
import { Notifications } from '../components/Notifications';
import { Settings } from '@/components/Settings';
import { Help } from '@/components/Help';
import TeamPage from '@/app/team/page';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'notes' | 'reminders' | 'settings' | 'help' | 'team' | 'notifications'>('dashboard');

  // Listen for navigation events from team chat page
  useEffect(() => {
    const handleNavigateToView = (event: CustomEvent) => {
      const view = event.detail as 'dashboard' | 'chat' | 'notes' | 'reminders' | 'settings' | 'help' | 'team' | 'notifications';
      setActiveView(view);
    };

    const handleSignOut = () => {
      signOut();
    };

    window.addEventListener('navigateToView', handleNavigateToView as EventListener);
    window.addEventListener('signOut', handleSignOut);

    return () => {
      window.removeEventListener('navigateToView', handleNavigateToView as EventListener);
      window.removeEventListener('signOut', handleSignOut);
    };
  }, [signOut]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading KYNEX.dev...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'dashboard' && <Dashboard />}
      {activeView === 'chat' && <Chat />}
      {activeView === 'notes' && <Notes />}
      {activeView === 'reminders' && <Reminders />}
      {activeView === 'notifications' && <Notifications />}
      {activeView === 'team' && <TeamPage />}
      {activeView === 'settings' && <Settings />}
      {activeView === 'help' && <Help />}
    </Layout>
  );
}

export default function Home() {
  return <AppContent />;
}
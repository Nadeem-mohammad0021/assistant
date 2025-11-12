'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { startReminderNotificationService } from '../lib/reminderNotifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (data?.user) {
        // Create profile record
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            preferences: {
              notifications_enabled: true,
              email_notifications: true,
              browser_notifications: true,
              theme: 'dark',
            },
          });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/reset-password',
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Start reminder notification service when user is authenticated
      // Only run in browser environment and when we have a user
      if (session?.user && typeof window !== 'undefined') {
        startReminderNotificationService();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Start reminder notification service when user signs in
        // Only run in browser environment and when we have a user
        if (session?.user && typeof window !== 'undefined') {
          startReminderNotificationService();
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  }), [user, session, loading, signUp, signIn, signOut, resetPassword]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
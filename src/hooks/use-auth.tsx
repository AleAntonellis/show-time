import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      configured,
      signIn: async (email, password) => {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(error.message);
        }
      },
      signUp: async (email, password, displayName) => {
        const { error } = await getSupabase().auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) {
          throw new Error(error.message);
        }
      },
      signOut: async () => {
        await getSupabase().auth.signOut();
      },
    }),
    [session, loading, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return ctx;
}

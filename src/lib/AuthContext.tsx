import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Site = 'citizen' | 'authority' | 'master';

export interface AuthorityProfile {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  age: number | null;
  gender: string | null;
  contact: string;
  second_contact: string | null;
  organization_email: string | null;
  organization_address: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  approved_until: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authorityProfile: AuthorityProfile | null;
  isMaster: boolean;
  isApprovedAuthority: boolean;
  site: Site;
  setSite: (site: Site) => void;
  sendLoginLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshAuthorityProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MASTER_EMAIL = 'itz.me.mario.brother@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorityProfile, setAuthorityProfile] = useState<AuthorityProfile | null>(null);
  const [site, setSite] = useState<Site>('citizen');

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;
  const isApprovedAuthority = authorityProfile?.status === 'approved'
    && Boolean(authorityProfile.approved_until)
    && new Date(authorityProfile.approved_until!).getTime() > Date.now();

  const loadAuthorityProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('authority_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setAuthorityProfile(data as AuthorityProfile | null);
  }, []);

  const refreshAuthorityProfile = useCallback(async () => {
    if (user) await loadAuthorityProfile(user.id);
  }, [user, loadAuthorityProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadAuthorityProfile(newSession.user.id);
        } else {
          setAuthorityProfile(null);
        }
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, [loadAuthorityProfile]);

  useEffect(() => {
    if (user) loadAuthorityProfile(user.id);
  }, [user, loadAuthorityProfile]);

  const sendLoginLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthorityProfile(null);
    setSite('citizen');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session, user, loading,
        authorityProfile, isMaster, isApprovedAuthority,
        site, setSite,
        sendLoginLink,
        signOut, refreshAuthorityProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

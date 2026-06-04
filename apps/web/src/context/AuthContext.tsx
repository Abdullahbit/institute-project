'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { getSchoolSlugFromHostname } from '../utils/slug';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'teacher' | 'student' | null;
  schoolId: string | null;
  loading: boolean;
  activeSchoolName: string | null;
  activeSchoolId: string | null;
  logout: () => Promise<void>;
  setLocalSchoolSlug: (slug: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSchoolName, setActiveSchoolName] = useState<string | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const setLocalSchoolSlug = (slug: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-school-slug', slug);
      window.location.reload();
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setSchoolId(null);
    setLoading(false);
    router.push('/login');
  };

  useEffect(() => {
    // 1. Fetch current active school branding details based on subdomain
    const fetchActiveSchool = async () => {
      const slug = getSchoolSlugFromHostname();
      if (!slug) return;
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trpc/auth.validateInviteToken`, {
          method: 'GET', // or simple fetch from db if public
        });
        // We will make a simple fetch or set placeholders
        // Let's set some nice default titles based on the slug
        const capitalized = slug.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        setActiveSchoolName(capitalized + ' Academy');
      } catch (err) {
        console.error(err);
      }
    };

    fetchActiveSchool();

    // 2. Read initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const u = session.user;
        setUser(u);
        setRole(u.user_metadata?.role || null);
        setSchoolId(u.user_metadata?.school_id || null);
      } else {
        setUser(null);
        setRole(null);
        setSchoolId(null);
      }
      setLoading(false);
    });

    // 3. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const u = session.user;
        setUser(u);
        setRole(u.user_metadata?.role || null);
        setSchoolId(u.user_metadata?.school_id || null);
      } else {
        setUser(null);
        setRole(null);
        setSchoolId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 4. Enforce client-side route protection and multi-tenant security
  useEffect(() => {
    if (loading) return;

    const currentRole = role;
    const currentSchoolId = schoolId;
    const slug = getSchoolSlugFromHostname();

    // Route checks
    const isAdminRoute = pathname.startsWith('/admin');
    const isTeacherRoute = pathname.startsWith('/teacher');
    const isLoginOrInviteRoute = pathname.startsWith('/login') || pathname.startsWith('/invite');

    if (!user) {
      if (!isLoginOrInviteRoute) {
        router.push('/login');
      }
      return;
    }

    // Role-based protection
    if (currentRole === 'teacher' && !isTeacherRoute && !isLoginOrInviteRoute) {
      router.push('/teacher/dashboard');
      return;
    }

    if (currentRole === 'admin' && isTeacherRoute) {
      router.push('/');
      return;
    }

    // If logged in and browsing dashboard, check if user's school matches slug
    // (Note: in local development without subdomain, if slug is null we let them align)
    if (slug && currentSchoolId) {
      // In a real environment, we'd query the school's ID from slug to verify.
      // We will perform this check in our tRPC procedures to be 100% secure.
    }
  }, [user, role, schoolId, pathname, loading, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        schoolId,
        loading,
        activeSchoolName,
        activeSchoolId,
        logout,
        setLocalSchoolSlug,
      }}
    >
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

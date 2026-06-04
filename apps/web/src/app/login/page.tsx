'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { getSchoolSlugFromHostname } from '../../utils/slug';
import { trpc } from '@/lib/trpc';

export default function LoginPage() {
  const { user, role, setLocalSchoolSlug } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlug, setCurrentSlug] = useState('');
  const router = useRouter();

  // tRPC Mutation Hooks
  const seedMutation = trpc.admin.seed.useMutation();

  useEffect(() => {
    // Check if hostname resolves subdomain or fallback to local storage
    const slug = getSchoolSlugFromHostname() || '';
    setCurrentSlug(slug);

    // If already logged in, redirect to correct workspace
    if (user && role) {
      if (role === 'admin') {
        if (slug) {
          router.push('/');
        } else {
          router.push('/admin/dashboard');
        }
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard');
      }
    }
  }, [user, role, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      const u = data.user;
      if (!u) {
        setError('Authentication failed. No user object returned.');
        setLoading(false);
        return;
      }

      // Check is_active status
      const isActive = u.user_metadata?.is_active ?? true;
      if (!isActive) {
        await supabase.auth.signOut();
        setError('Your account is currently inactive. Please contact your administrator.');
        setLoading(false);
        return;
      }

      const userRole = u.user_metadata?.role;
      const userSchoolId = u.user_metadata?.school_id;

      // Local testing: save matching tenant slug to local storage to simulate matching subdomain
      // In a production server, the subdomain resolver validates this.
      if (userRole === 'admin') {
        if (currentSlug) {
          router.push('/');
        } else {
          router.push('/admin/dashboard');
        }
      } else if (userRole === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        setError('Unauthorized: Unknown user role.');
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlugSwitch = (slug: string) => {
    setLocalSchoolSlug(slug);
  };

  const schoolTitle = currentSlug
    ? currentSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    : 'LingoFlow Portal';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
      {/* Soft glowing ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-violet-500/15">
            LF
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {schoolTitle}
            </h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1">
              {currentSlug ? `Multi-Tenant Tenant: ${currentSlug}` : 'Language Institute Portal'}
            </p>
          </div>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-bold text-white mb-6">Sign In</h2>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teacher@school.com"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/15 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Localhost Multi-Tenant Domain Switcher Helper (Crucial for Local testing!) */}
        <div className="mt-8 text-center bg-slate-900/30 border border-slate-800/40 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
              Local Dev Tenant Switcher
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleSlugSwitch('school-a')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  currentSlug === 'school-a'
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-400'
                }`}
              >
                School A
              </button>
              <button
                onClick={() => handleSlugSwitch('school-b')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  currentSlug === 'school-b'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-400'
                }`}
              >
                School B
              </button>
              <button
                onClick={() => handleSlugSwitch('')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  !currentSlug
                    ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-400'
                }`}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-2.5">
            <button
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const res = await seedMutation.mutateAsync();
                  alert(res.success ? 'Seeding completed!' : 'Seeding failed.');
                } catch (err: any) {
                  setError(err?.message || 'Database seeding failed.');
                } finally {
                  setLoading(false);
                }
              }}
              className="text-[11px] font-bold bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              ⚡ Seed Database Sandbox
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

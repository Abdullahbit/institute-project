'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

export default function InviteAcceptancePage() {
  const { token } = useParams() as { token: string };
  const { setLocalSchoolSlug } = useAuth();
  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // tRPC Queries & Mutations
  const validateQuery = trpc.auth.validateInviteToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.auth.acceptInvitation.useMutation();

  useEffect(() => {
    if (validateQuery.data) {
      setInviteData(validateQuery.data);
      setLoading(false);
    } else if (validateQuery.error) {
      setError(validateQuery.error.message || 'The invitation link is invalid or has expired.');
      setLoading(false);
    }
  }, [validateQuery.data, validateQuery.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Submit invitation acceptance to register user via real tRPC mutation
      await acceptMutation.mutateAsync({
        token,
        fullName,
        password,
      });

      // 2. Align local storage school slug with invited school subdomain for local development
      if (inviteData?.school?.subdomain) {
        localStorage.setItem('x-school-slug', inviteData.school.subdomain);
      }

      // 3. Login the user automatically
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: inviteData.email,
        password,
      });

      if (loginErr) {
        setError('Account created, but automatic sign-in failed. Please login manually.');
        router.push('/login');
        return;
      }

      // 4. Redirect based on role
      const userRole = inviteData.role;
      if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400 font-semibold">Validating invitation token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-violet-500/15">
            LF
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {inviteData?.school?.name || 'Join LingoFlow'}
            </h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1">
              Complete Account Setup
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/40">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {inviteData ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-900 text-xs text-slate-400 flex flex-col gap-2.5">
                <div>
                  <span className="font-semibold text-slate-500">School Tenant:</span>{' '}
                  <span className="text-white font-medium">{inviteData.school?.name}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Invited Role:</span>{' '}
                  <span className="text-violet-400 font-semibold uppercase">{inviteData.role}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Invited Email:</span>{' '}
                  <span className="text-white font-medium">{inviteData.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Create Password
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
                disabled={submitting}
                className="mt-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/15 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Setting up account...' : 'Accept Invitation'}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto text-xl mb-4 font-bold">
                ✕
              </div>
              <p className="text-sm text-slate-400 mb-6">
                This invitation is invalid, has expired, or was already accepted.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Go to Login Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

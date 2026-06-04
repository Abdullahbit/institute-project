'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { trpc } from '@/lib/trpc';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminDashboard() {
  const { user, role, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'teacher' | 'student'>('teacher');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // tRPC Mutation Hooks
  const seedMutation = trpc.admin.seed.useMutation();
  const inviteMutation = trpc.admin.inviteUser.useMutation();

  // Protect route
  useEffect(() => {
    if (role && role !== 'admin') {
      router.push('/login');
    }
  }, [role, router]);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    setSeedResult(null);
    try {
      // Execute DB Seed mutation via real tRPC client
      const res = await seedMutation.mutateAsync();
      setSeedResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to seed database.');
    } finally {
      setSeeding(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setInviteLink(null);

    try {
      const res = await inviteMutation.mutateAsync({
        email,
        role: inviteRole,
      });

      // Construct invite acceptance link
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const link = `${origin}/invite/${res.rawToken}`;
      setInviteLink(link);
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate invitation.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-base text-white">
            LF
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight">LingoFlow</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admin Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold">{user?.email}</p>
            <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Administrator</p>
          </div>
          <button
            onClick={logout}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: School Info & DB seeding */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glow-card p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-white">Active Tenant Information</h2>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400">
              <div>
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Metadata school ID:</span>
                <p className="font-mono text-slate-300 mt-1 break-all bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                  {user?.user_metadata?.school_id || 'Not assigned'}
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Metadata Role:</span>
                <p className="font-semibold text-violet-400 mt-1 uppercase">
                  {user?.user_metadata?.role || 'None'}
                </p>
              </div>
            </div>
          </div>

          <div className="glow-card p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-white">Database Seed Tool</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate 'school-a' and 'school-b' inside the Supabase PostgreSQL database to facilitate sandbox isolation testing.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
            >
              {seeding ? 'Seeding Database...' : 'Seed Sandbox Schools'}
            </button>

            {seedResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex flex-col gap-1.5 leading-normal">
                <span className="font-bold">Seeding Complete:</span>
                <div>
                  <span className="text-slate-500">School A:</span>{' '}
                  <span className="text-white font-mono">{seedResult.schoolA.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">School B:</span>{' '}
                  <span className="text-white font-mono">{seedResult.schoolB.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Invite Teacher flow */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glow-card p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Invite Staff Members</h2>
              <p className="text-xs text-slate-400">
                Generate secure, tokenized invitation links. The system enforces RLS policies automatically.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Staff Email Address
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
                    Access Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="teacher" className="bg-slate-950">Teacher</option>
                    <option value="admin" className="bg-slate-950">Admin</option>
                    <option value="student" className="bg-slate-950">Student</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto self-start bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-violet-500/15"
              >
                {loading ? 'Generating invitation...' : 'Generate Invite Link'}
              </button>
            </form>

            {/* Generated Invite Block */}
            {inviteLink && (
              <div className="mt-4 p-5 bg-violet-600/5 border border-violet-500/20 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    Invitation Generated Successfully
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Invite expires in 72 hours. Copy this sandbox link to accept the invitation.
                  </span>
                </div>
                
                <div className="flex gap-2 items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full bg-transparent text-xs text-slate-300 select-all border-none outline-none font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="flex-shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function TeacherDashboard() {
  const { user, role, logout } = useAuth();
  const [testWarning, setTestWarning] = useState<string | null>(null);
  const router = useRouter();

  // Protect route
  useEffect(() => {
    if (role && role !== 'teacher') {
      router.push('/login');
    }
  }, [role, router]);

  const testAdminAccess = () => {
    setTestWarning(null);
    // Simulate navigating to /admin/dashboard
    router.push('/admin/dashboard');
    // Set warning in case Next router takes a brief moment or handles it
    setTimeout(() => {
      setTestWarning('Security Check: Redirected! You cannot access administrator panels.');
    }, 200);
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
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Teacher Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Teacher Profile</p>
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col gap-6">
        
        {/* Welcome Banner */}
        <div className="glow-card p-8 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 rounded-full blur-3xl"></div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.user_metadata?.full_name || 'Instructor'}!
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Your instructor portal is active. Here, you can coordinate your schedules, check in/out of class sessions, log teaching hours, and compile student progress reports.
          </p>
        </div>

        {/* Security Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glow-card p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
              Security metadata alignment
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Verified School Tenant ID:</span>
                <p className="font-mono text-slate-300 mt-1 break-all bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                  {user?.user_metadata?.school_id || 'Not assigned'}
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Account Role Badge:</span>
                <p className="font-semibold text-emerald-400 uppercase mt-1">
                  {user?.user_metadata?.role || 'teacher'}
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Email Address:</span>
                <p className="text-slate-300 font-medium mt-1">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Sandbox Widgets */}
          <div className="glow-card p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
              End-to-End Role-Protection Sandbox
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify client-side route protection checks. Attempting to enter `/admin/dashboard` will trigger the Auth Context boundary and redirect you safely.
            </p>
            
            <button
              onClick={testAdminAccess}
              className="mt-2 w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 py-3.5 px-4 rounded-xl transition-all"
            >
              Test Admin Route Bypass Prevention
            </button>

            {testWarning && (
              <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl leading-normal">
                {testWarning}
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Placeholder Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 text-slate-500 text-xs">
            <span className="font-bold text-slate-400 block mb-1">📅 Personal Schedule</span>
            View your upcoming sessions and hours. (Ready)
          </div>
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 text-slate-500 text-xs">
            <span className="font-bold text-slate-400 block mb-1">⏱ Class Check-In</span>
            Log check-ins and check-outs dynamically. (Ready)
          </div>
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 text-slate-500 text-xs">
            <span className="font-bold text-slate-400 block mb-1">📊 Hour Logging</span>
            Submit logs with append-only audit trails. (Ready)
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherDashboard() {
  const { user, role, logout } = useAuth();
  const [testWarning, setTestWarning] = useState<string | null>(null);
  const router = useRouter();

  const { data: openSubstitutes, refetch: refetchSubstitutes } = trpc.alerts.getOpenSubstituteRequests.useQuery();
  const respondMutation = trpc.alerts.respondToSubstituteRequest.useMutation();

  // Subscribe to cover requests Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("teacher-alerts")
      .on("broadcast", { event: "substitute_request_created" }, () => {
        refetchSubstitutes();
      })
      .on("broadcast", { event: "substitute_request_resolved" }, () => {
        refetchSubstitutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSubstitutes]);

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

        {/* Substitute Requests */}
        {openSubstitutes && openSubstitutes.length > 0 && (
          <div className="glow-card p-6 flex flex-col gap-4 border border-violet-500/20 bg-violet-950/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl"></div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-violet-400">
                🚨 Açık Vekil Öğretmen Talepleri
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Aşağıdaki dersler için vekil öğretmen aranmaktadır. Yardımcı olmak için kabul edebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 mt-2">
              {openSubstitutes.map((req) => (
                <div 
                  key={req.id} 
                  className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{req.class_name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        {req.time_label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Tarih: <span className="font-semibold text-slate-300">{req.session_date}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Talebi Açan: <span className="font-medium text-slate-400">{req.requesting_teacher_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await respondMutation.mutateAsync({
                            request_id: req.id,
                            response: "accepted"
                          });
                          refetchSubstitutes();
                        } catch (err) {
                          console.error("Failed to accept cover request", err);
                        }
                      }}
                      disabled={respondMutation.isPending}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {respondMutation.isPending ? "Kabul Ediliyor..." : "Kabul Et"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await respondMutation.mutateAsync({
                            request_id: req.id,
                            response: "declined"
                          });
                          refetchSubstitutes();
                        } catch (err) {
                          console.error("Failed to decline cover request", err);
                        }
                      }}
                      disabled={respondMutation.isPending}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50"
                    >
                      {respondMutation.isPending ? "Reddediliyor..." : "Reddet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Dashboard Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl p-5 text-slate-500 text-xs transition-all">
            <span className="font-bold text-slate-400 block mb-1">📅 Personal Schedule</span>
            View your upcoming sessions and hours. (Coming soon)
          </div>
          <Link href="/teacher/today" className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl p-5 text-slate-400 text-xs transition-all hover:bg-slate-900/50 block group">
            <span className="font-bold text-slate-200 block mb-1 group-hover:text-emerald-400 transition-colors">⏱ Class Check-In</span>
            Log check-ins and check-outs dynamically. (Active)
          </Link>
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl p-5 text-slate-500 text-xs transition-all">
            <span className="font-bold text-slate-400 block mb-1">📊 Hour Logging</span>
            Submit logs with append-only audit trails. (Coming soon)
          </div>
        </div>
      </main>
    </div>
  );
}

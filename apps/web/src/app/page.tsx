import React from 'react';
import { Button } from '@lingoflow/ui';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-500/20">
            LF
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LingoFlow
            </h1>
            <p className="text-xs text-slate-500 font-medium">Institute Management SaaS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full font-semibold border border-emerald-500/20">
            Active Tenant: brightminds.lingoflow.com
          </span>
          <Button>Dashboard</Button>
        </div>
      </header>

      {/* Main Premium Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Tenant Control Center
          </h2>
          <p className="text-slate-400 max-w-2xl text-sm">
            Welcome to the monorepo foundation of LingoFlow. This workspace integrates Next.js 14, Fastify + tRPC API, and Expo mobile using shared packages.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glow-card p-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Teachers</span>
            <span className="text-3xl font-extrabold text-white">42</span>
            <span className="text-xs text-emerald-400 font-medium">↑ 12% this week</span>
          </div>
          <div className="glow-card p-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Class Hours Today</span>
            <span className="text-3xl font-extrabold text-white">128 hrs</span>
            <span className="text-xs text-slate-400 font-medium">16 active sessions</span>
          </div>
          <div className="glow-card p-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Log Approvals</span>
            <span className="text-3xl font-extrabold text-violet-400">8 logs</span>
            <span className="text-xs text-amber-400 font-medium">Requires admin review</span>
          </div>
          <div className="glow-card p-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Alerts</span>
            <span className="text-3xl font-extrabold text-rose-500">1 alert</span>
            <span className="text-xs text-rose-400 font-medium">1 late check-in detected</span>
          </div>
        </div>

        {/* Workspace Components & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          {/* Next.js status */}
          <div className="glow-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center font-bold text-sm border border-slate-800">
                N
              </div>
              <h3 className="font-bold text-white text-base">apps/web (Next.js)</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Provides the multi-tenant administration interface. Features strict TS compilation, subdomain resolution, and Tailwind CSS.
            </p>
            <div className="mt-auto pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
              <span>Port: 3000</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Healthy
              </span>
            </div>
          </div>

          {/* Fastify status */}
          <div className="glow-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/50 flex items-center justify-center font-bold text-sm border border-emerald-900/30 text-emerald-400">
                F
              </div>
              <h3 className="font-bold text-white text-base">apps/api (Fastify + tRPC)</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Fastify engine driving the modular monolith. Integrates tRPC v11 routing, Zod parsing, and row-level isolated Supabase DB connections.
            </p>
            <div className="mt-auto pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
              <span>Port: 4000</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Healthy
              </span>
            </div>
          </div>

          {/* Expo status */}
          <div className="glow-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/50 flex items-center justify-center font-bold text-sm border border-indigo-900/30 text-indigo-400">
                E
              </div>
              <h3 className="font-bold text-white text-base">apps/mobile (Expo)</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Teacher and student native mobile applications powered by Expo SDK 51, offering native-first navigation and atomic components.
            </p>
            <div className="mt-auto pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
              <span>Port: Expo Dev</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Healthy
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-slate-900 px-8 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} LingoFlow Multi-Tenant SaaS. Enforcing Enterprise Security & RLS Isolation.
      </footer>
    </div>
  );
}

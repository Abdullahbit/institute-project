"use client";

import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";

export default function UyarilarPage() {
  const { data, isLoading } = trpc.alerts.list.useQuery({ limit: 20 });

  return (
    <AdminShell title="Uyarılar" subtitle="Supabase Realtime hazır (şema)">
      {isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {data && (
        <ul className="space-y-3">
          {data.map((alert) => (
            <li
              key={alert.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between gap-4">
                <p className="font-medium">{alert.title}</p>
                <span className="text-xs text-slate-400 shrink-0">
                  {alert.type}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
              {alert.teacher_name && (
                <p className="text-xs text-slate-500 mt-2">{alert.teacher_name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

"use client";

import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  active: "Aktif",
  on_leave: "İzinli",
  inactive: "Pasif",
};

export default function OgretmenlerPage() {
  const { data, isLoading, error } = trpc.teachers.list.useQuery();

  return (
    <AdminShell
      title="Öğretmenler"
      subtitle="tRPC teachers.list — Supabase veya mock fallback"
    >
      {isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {error && (
        <p className="text-red-600">API hatası — port 4000 çalışıyor mu?</p>
      )}
      {data && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Ad Soyad</th>
                <th className="p-3">Branş</th>
                <th className="p-3 text-center">Aktif Dersler</th>
                <th className="p-3 text-center">Aylık Saat</th>
                <th className="p-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-medium">{t.full_name}</td>
                  <td className="p-3">{t.branch}</td>
                  <td className="p-3 text-center">{t.active_class_count}</td>
                  <td className="p-3 text-center">{t.monthly_hours} saat</td>
                  <td className="p-3">{statusLabels[t.status] ?? t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

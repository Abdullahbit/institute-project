"use client";

import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
  substitute_needed: "Vekil Bekleniyor",
  scheduled: "Bekliyor",
};

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.dashboard.summary.useQuery();

  if (isLoading) {
    return (
      <AdminShell title="Ana Sayfa" subtitle="Yükleniyor…">
        <p className="text-slate-500">Veriler API&apos;den alınıyor…</p>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Ana Sayfa">
        <p className="text-red-600">
          API bağlantısı kurulamadı. <code>pnpm dev</code> ile API&apos;yi
          başlatın (port 4000).
        </p>
      </AdminShell>
    );
  }

  const summary = data!;

  return (
    <AdminShell
      title="Ana Sayfa"
      subtitle="Bright Minds Dil Okulu — canlı API verisi"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Bugünkü Dersler", value: summary.lessons_today },
          { label: "Aktif Öğretmenler", value: summary.active_teachers },
          { label: "Toplam Öğrenci", value: summary.total_students },
          { label: "Bekleyen Onaylar", value: summary.pending_approvals },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="px-4 py-3 border-b font-medium">Bugünkü Program</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Saat</th>
                <th className="p-3">Sınıf</th>
                <th className="p-3">Öğretmen</th>
                <th className="p-3 text-center">Öğrenci</th>
                <th className="p-3 text-right">Durum</th>
              </tr>
            </thead>
            <tbody>
              {summary.today_schedule.map((lesson) => (
                <tr key={lesson.id} className="border-t">
                  <td className="p-3">{lesson.time_label}</td>
                  <td className="p-3">{lesson.class_name}</td>
                  <td className="p-3">{lesson.teacher_name}</td>
                  <td className="p-3 text-center">{lesson.student_count}</td>
                  <td className="p-3 text-right text-slate-600">
                    {statusLabels[lesson.status] ?? lesson.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <h2 className="px-4 py-3 border-b font-medium">Son Uyarılar</h2>
          <ul className="divide-y">
            {summary.recent_alerts.map((alert) => (
              <li key={alert.id} className="p-4">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-xs text-slate-500 mt-1">{alert.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

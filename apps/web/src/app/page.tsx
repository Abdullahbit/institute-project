"use client";

import React from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserX, 
  CheckSquare, 
  MessageSquare,
  ChevronRight
} from "lucide-react";

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
          Devam Ediyor
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Tamamlandı
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 border border-red-200">
          İptal
        </span>
      );
    case "substitute_needed":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
          Vekil Bekleniyor
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Bekliyor
        </span>
      );
  }
}

function getAlertConfig(type: string) {
  switch (type) {
    case "late_check_in":
      return {
        icon: Clock,
        color: "text-orange-500",
        bg: "bg-orange-50/10",
        label: "Geç Giriş"
      };
    case "substitute_request":
      return {
        icon: AlertCircle,
        color: "text-blue-500",
        bg: "bg-blue-50/10",
        label: "Vekil Talebi"
      };
    case "no_show":
      return {
        icon: UserX,
        color: "text-red-500",
        bg: "bg-red-50/10",
        label: "Devamsızlık"
      };
    case "hour_approval":
      return {
        icon: CheckSquare,
        color: "text-emerald-500",
        bg: "bg-emerald-50/10",
        label: "Saat Onayı"
      };
    default:
      return {
        icon: MessageSquare,
        color: "text-slate-500",
        bg: "bg-slate-50/10",
        label: "Bildirim"
      };
  }
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch: refetchSummary } = trpc.dashboard.summary.useQuery();
  const { data: openSubstitutes, refetch: refetchSubstitutes } = trpc.alerts.getOpenSubstituteRequests.useQuery();
  const createSubMutation = trpc.alerts.createSubstituteRequest.useMutation();
  const router = useRouter();

  React.useEffect(() => {
    const channel = supabase
      .channel("alerts")
      .on("broadcast", { event: "alerts_update" }, () => {
        refetchSummary();
      })
      .on("broadcast", { event: "substitute_request_resolved" }, () => {
        refetchSummary();
        refetchSubstitutes();
      })
      .on("broadcast", { event: "substitute_request_created" }, () => {
        refetchSummary();
        refetchSubstitutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSummary, refetchSubstitutes]);

  if (isLoading) {
    return (
      <AdminShell title="Ana Sayfa" subtitle="Yükleniyor…">
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500 font-medium">Veriler API'den alınıyor…</div>
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Ana Sayfa">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h3 className="font-bold text-lg mb-2">API Bağlantı Hatası</h3>
          <p className="text-sm">
            API sunucusuna bağlanılamadı. Lütfen arka uç sunucusunun port 4000 üzerinde çalıştığından emin olun (<code>pnpm run dev</code>).
          </p>
        </div>
      </AdminShell>
    );
  }

  const summary = data!;

  return (
    <AdminShell
      title="Ana Sayfa"
      subtitle="Bright Minds Dil Okulu günlük özet tablosu."
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Bugünkü Dersler", value: summary.lessons_today, icon: BookOpen, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Aktif Öğretmenler", value: summary.active_teachers, icon: Users, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Toplam Öğrenci", value: summary.total_students, icon: GraduationCap, bg: "bg-purple-50", text: "text-purple-600" },
          { label: "Bekleyen Onaylar", value: summary.pending_approvals, icon: CheckCircle2, bg: "bg-amber-50", text: "text-amber-600" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md"
          >
            <div className={`p-3 rounded-lg ${card.bg} ${card.text}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-lg text-slate-900">Bugünkü Program</h2>
            <button 
              onClick={() => router.push("/program")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Tümünü Gör <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Saat</th>
                  <th className="px-6 py-4">Sınıf</th>
                  <th className="px-6 py-4">Öğretmen</th>
                  <th className="px-6 py-4 text-center">Öğrenci</th>
                  <th className="px-6 py-4 text-center">Durum</th>
                  <th className="px-6 py-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.today_schedule.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Bugün için planlanmış bir ders bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  summary.today_schedule.map((lesson) => {
                    const hasCoverRequest = openSubstitutes?.some(
                      (req) => req.lesson_session_id === lesson.id
                    );
                    return (
                      <tr key={lesson.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-600">{lesson.time_label}</td>
                        <td className="px-6 py-4 text-slate-950 font-medium">{lesson.class_name}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{lesson.teacher_name}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{lesson.student_count}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(lesson.status)}</td>
                        <td className="px-6 py-4 text-right">
                          {lesson.status !== "completed" && lesson.status !== "cancelled" ? (
                            hasCoverRequest ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
                                Vekil Bekleniyor
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    await createSubMutation.mutateAsync({ session_id: lesson.id });
                                    refetchSubstitutes();
                                    refetchSummary();
                                  } catch (err) {
                                    console.error("Vekil çağırma hatası:", err);
                                  }
                                }}
                                disabled={createSubMutation.isPending}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                              >
                                {createSubMutation.isPending ? "Çağrılıyor..." : "Vekil Çağır"}
                              </button>
                            )
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts Card */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
          <h2 className="font-semibold text-lg text-slate-900 mb-4 pb-1">Son Uyarılar</h2>
          <div className="flex-1 space-y-4">
            {summary.recent_alerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 font-medium">Aktif uyarı bulunmuyor.</p>
            ) : (
              summary.recent_alerts.map((alert) => {
                const config = getAlertConfig(alert.type);
                return (
                  <div 
                    key={alert.id} 
                    className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50 transition-colors hover:bg-slate-50"
                  >
                    <div className={`mt-0.5 p-2 rounded-md ${config.bg} ${config.color}`}>
                      <config.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 truncate">{config.label}</p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(alert.occurred_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words">
                        <span className="font-semibold text-slate-700">{alert.teacher_name || "Sistem"}</span>: {alert.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button 
            onClick={() => router.push("/uyarilar")}
            className="w-full mt-4 py-2.5 border border-slate-200/80 rounded-lg text-xs font-semibold text-primary hover:bg-blue-50 transition-colors"
          >
            Tüm Uyarıları Görüntüle
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

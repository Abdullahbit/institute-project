"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Award,
  Calendar,
  Clock,
  Star,
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Users,
} from "lucide-react";
import Link from "next/link";

const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  excellent: { label: "Mükemmel", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: <Star className="h-3.5 w-3.5" /> },
  good: { label: "İyi", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
  warning: { label: "Dikkat", color: "text-amber-600 bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  issue: { label: "Sorun", color: "text-rose-600 bg-rose-50 border-rose-200", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

export default function ParentDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // 1. Get children
  const { data: children, isLoading: loadingChildren } = trpc.parents.getMyChildren.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  // Auto-select first child
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id);
    }
  }, [children, selectedChildId]);

  // 2. Get dashboard for selected child
  const { data: dashboard, isLoading: loadingDashboard } = trpc.parents.getChildDashboard.useQuery(
    { student_id: selectedChildId! },
    { enabled: !!selectedChildId }
  );

  if (authLoading || loadingChildren) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm font-medium text-slate-500">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <AdminShell title="Veli Paneli" subtitle="Hoş geldiniz">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-700">Henüz Bağlı Öğrenci Yok</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md">
            Hesabınıza henüz bir öğrenci bağlanmamış. Lütfen okul yönetimiyle iletişime geçin.
          </p>
        </div>
      </AdminShell>
    );
  }

  const selectedChild = children.find((c) => c.student_id === selectedChildId);

  return (
    <AdminShell
      title="Veli Paneli"
      subtitle={`Hoş geldiniz, ${user?.user_metadata?.full_name || "Veli"}!`}
    >
      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {children.map((child) => (
            <button
              key={child.student_id}
              onClick={() => setSelectedChildId(child.student_id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                selectedChildId === child.student_id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {child.student_name}
              {child.class_name && (
                <span className={`ml-2 text-xs font-medium ${selectedChildId === child.student_id ? "text-white/70" : "text-slate-400"}`}>
                  ({child.class_name})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loadingDashboard ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : dashboard ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Class Info */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sınıf / Seviye</span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  {dashboard.student.class_name || "Atanmamış"}
                </h3>
                {dashboard.student.level_code && (
                  <span className="text-xs text-slate-500">{dashboard.student.level_code}</span>
                )}
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-lg ${dashboard.attendance.rate >= 80 ? "bg-emerald-50 text-emerald-600" : dashboard.attendance.rate >= 60 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Yoklama ({dashboard.attendance.month})</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                  %{dashboard.attendance.rate}
                </h3>
                <span className="text-[10px] text-slate-500">
                  {dashboard.attendance.present} geldi · {dashboard.attendance.absent} gelmedi · {dashboard.attendance.late} geç
                </span>
              </div>
            </div>

            {/* Latest Score */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Genel Başarı</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                  {dashboard.latest_report ? `${dashboard.latest_report.score_overall}/100` : "Rapor Yok"}
                </h3>
                {dashboard.latest_report && (
                  <span className="text-[10px] text-slate-500">
                    Dinleme: {dashboard.latest_report.score_listening} · Konuşma: {dashboard.latest_report.score_speaking}
                  </span>
                )}
              </div>
            </div>

            {/* Today's Lessons */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bugünkü Dersler</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                  {dashboard.today_sessions.length} Ders
                </h3>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Today's sessions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Lessons */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Bugünkü Ders Programı
                  </h2>
                  <Link
                    href="/parent/schedule"
                    className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    Tüm Program <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {dashboard.today_sessions.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-500 text-sm">
                    Bugün için planlanmış ders bulunmuyor.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dashboard.today_sessions.map((session, i) => (
                      <div key={i} className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-14 text-center py-1.5 px-2 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            {session.start_time?.slice(0, 5)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}</span>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Öğretmen: {session.teacher_name} · Derslik: {session.room_name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/parent/attendance"
                  className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-slate-800 text-sm">Yoklama Takibi</h3>
                  <p className="text-xs text-slate-500 mt-1">Aylık yoklama detayları</p>
                </Link>
                <Link
                  href="/parent/progress"
                  className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <Award className="h-8 w-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-slate-800 text-sm">Gelişim Raporu</h3>
                  <p className="text-xs text-slate-500 mt-1">Dinleme, konuşma puanları</p>
                </Link>
                <Link
                  href="/parent/behavior"
                  className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <Star className="h-8 w-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-slate-800 text-sm">Davranış Notları</h3>
                  <p className="text-xs text-slate-500 mt-1">Öğretmen geri bildirimleri</p>
                </Link>
              </div>
            </div>

            {/* Right: Recent Behavior Feedbacks */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" /> Son Geri Bildirimler
                  </h2>
                  <Link
                    href="/parent/behavior"
                    className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    Tümü <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {dashboard.recent_feedbacks.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 text-xs">
                    Henüz geri bildirim bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboard.recent_feedbacks.map((fb) => {
                      const config = categoryConfig[fb.category] || categoryConfig.good;
                      return (
                        <div
                          key={fb.id}
                          className={`p-3 rounded-lg border ${config.color} flex items-start gap-3`}
                        >
                          <div className="mt-0.5">{config.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{fb.title}</span>
                              <span className="text-[10px] opacity-70">{config.label}</span>
                            </div>
                            <div className="text-[10px] mt-1 opacity-70">
                              {fb.teacher_name} · {fb.feedback_date}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Latest Report Card */}
              {dashboard.latest_report && (
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-purple-500" /> Son Gelişim Raporu
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">Dinleme</span>
                        <span className="font-bold text-slate-800">{dashboard.latest_report.score_listening}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${dashboard.latest_report.score_listening}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">Konuşma</span>
                        <span className="font-bold text-slate-800">{dashboard.latest_report.score_speaking}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${dashboard.latest_report.score_speaking}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">Genel</span>
                        <span className="font-bold text-slate-800">{dashboard.latest_report.score_overall}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${dashboard.latest_report.score_overall}%` }}
                        />
                      </div>
                    </div>
                    {dashboard.latest_report.notes && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 italic">
                        "{dashboard.latest_report.notes}"
                      </div>
                    )}
                    <Link
                      href="/parent/progress"
                      className="block text-center text-xs font-semibold text-primary hover:text-primary/80 mt-2"
                    >
                      Tüm Raporları Gör →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

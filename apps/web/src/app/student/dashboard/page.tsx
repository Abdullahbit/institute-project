"use client";

import React from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Award,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function StudentDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  
  // Queries
  const { data: scheduleData, isLoading: loadingSchedule } = trpc.students.getStudentSchedule.useQuery(undefined, {
    enabled: !authLoading && !!user
  });
  const { data: attendanceData, isLoading: loadingAttendance } = trpc.students.getStudentAttendance.useQuery(undefined, {
    enabled: !authLoading && !!user
  });
  const { data: reportsData, isLoading: loadingReports } = trpc.students.getMyReportCards.useQuery(undefined, {
    enabled: !authLoading && !!user
  });

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm font-medium text-slate-500">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const loading = loadingSchedule || loadingAttendance || loadingReports;

  if (loading) {
    return (
      <AdminShell title="Öğrenci Paneli" subtitle="Yükleniyor...">
        <div className="flex justify-center items-center py-20">
          <div className="text-slate-500 font-medium">Bilgileriniz yükleniyor...</div>
        </div>
      </AdminShell>
    );
  }

  // Calculate stats
  const totalLogs = attendanceData?.length || 0;
  const presentCount = attendanceData?.filter(a => a.status === "present").length || 0;
  const lateCount = attendanceData?.filter(a => a.status === "late").length || 0;
  const absentCount = attendanceData?.filter(a => a.status === "absent").length || 0;

  const attendanceRate = totalLogs > 0 
    ? Math.round(((presentCount + lateCount) / totalLogs) * 100) 
    : 100; // fallback if no logs yet

  const avgOverallScore = reportsData && reportsData.length > 0
    ? Math.round(reportsData.reduce((acc, curr) => acc + curr.score_overall, 0) / reportsData.length)
    : null;

  const daysOfWeek = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  return (
    <AdminShell
      title="Öğrenci Paneli"
      subtitle={`Tekrar hoş geldin, ${user?.user_metadata?.full_name || 'Öğrenci'}!`}
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Class name */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kayıtlı Sınıf</span>
            <h3 className="text-base font-bold text-slate-800 mt-0.5 truncate max-w-[150px]">
              {scheduleData?.class_name || "Sınıf Atanmamış"}
            </h3>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Yoklama Katılımı</span>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">
              %{attendanceRate} <span className="text-xs text-slate-500 font-medium">({presentCount + lateCount}/{totalLogs})</span>
            </h3>
          </div>
        </div>

        {/* Avg Score */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Genel Başarı Ort.</span>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">
              {avgOverallScore !== null ? `${avgOverallScore}/100` : "Karne Yok"}
            </h3>
          </div>
        </div>

        {/* Today's Lessons count */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bugünkü Derslerim</span>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">
              {scheduleData?.today_sessions?.length || 0} Ders
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's status, weekly program, and report cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Lessons list */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-base text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" /> Bugünün Ders Seansları
            </h2>
            
            {!scheduleData?.today_sessions || scheduleData.today_sessions.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 font-medium text-xs">
                Bugün için planlanmış dersiniz bulunmuyor.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {scheduleData.today_sessions.map((session: any) => (
                  <div key={session.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800">{session.time_label}</span>
                      <span className="text-slate-500 font-semibold">Öğretmen: {session.teacher_name}</span>
                    </div>
                    <div>
                      {session.status === "completed" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Tamamlandı
                        </span>
                      ) : session.status === "ongoing" || session.status === "in_progress" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          Devam Ediyor
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-50 text-slate-600 border border-slate-200">
                          Planlandı
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Schedule list */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-base text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-primary" /> Haftalık Ders Programım
            </h2>

            {!scheduleData?.slots || scheduleData.slots.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 font-medium text-xs">
                Kayıtlı haftalık ders planı bulunmamaktadır.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Gün</th>
                      <th className="py-2.5">Saat</th>
                      <th className="py-2.5">Derslik</th>
                      <th className="py-2.5">Öğretmen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {scheduleData.slots.map((slot: any) => (
                      <tr key={slot.id} className="text-slate-700 hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-900">{daysOfWeek[slot.day_of_week]}</td>
                        <td className="py-3 font-semibold text-slate-600">{slot.start_time} - {slot.end_time}</td>
                        <td className="py-3 font-semibold text-slate-600">{slot.room_name}</td>
                        <td className="py-3 font-semibold text-slate-600">{slot.teacher_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Gelişim Raporları / Karneler */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-base text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-primary" /> Karnelerim & Değerlendirme Raporları
            </h2>

            {!reportsData || reportsData.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 font-medium text-xs">
                Henüz öğretmenleriniz tarafından bir gelişim raporu girilmemiş.
              </div>
            ) : (
              <div className="space-y-4">
                {reportsData.map((report: any) => (
                  <div key={report.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800">{report.level_code} Karnesi</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(report.report_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">Öğretmen: {report.teacher_name}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                        <p className="text-[10px] text-slate-450 uppercase font-bold">Dinleme</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{report.score_listening}/100</p>
                      </div>
                      <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                        <p className="text-[10px] text-slate-450 uppercase font-bold">Konuşma</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{report.score_speaking}/100</p>
                      </div>
                      <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                        <p className="text-[10px] text-slate-450 uppercase font-bold">Genel Değ.</p>
                        <p className="font-bold text-primary text-sm mt-0.5">{report.score_overall}/100</p>
                      </div>
                    </div>

                    {report.notes && (
                      <div className="bg-white/60 border border-slate-150/40 rounded-lg p-3 text-xs leading-relaxed text-slate-650 flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-slate-450 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wide">Öğretmen Değerlendirmesi:</p>
                          <p className="mt-0.5">{report.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance logs history */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-base text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-primary" /> Yoklama Geçmişim
            </h2>

            {!attendanceData || attendanceData.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">Yoklama kaydı bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {attendanceData.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between text-xs p-3 border border-slate-50 rounded-xl bg-slate-50/20 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-800">
                        {new Date(log.session_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[130px]">{log.class_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {log.status === "present" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Katıldı
                        </span>
                      ) : log.status === "late" ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 text-[10px]">
                          <Clock className="h-3 w-3" /> Geç Kaldı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 text-[10px]">
                          <XCircle className="h-3 w-3" /> Gelmedi
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

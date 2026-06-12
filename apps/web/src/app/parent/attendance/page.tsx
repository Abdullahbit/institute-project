"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react";

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
};

export default function ParentAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0].value);

  const { data: children, isLoading: loadingChildren } = trpc.parents.getMyChildren.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id);
    }
  }, [children, selectedChildId]);

  const { data: logs, isLoading: loadingLogs } = trpc.parents.getChildAttendance.useQuery(
    { student_id: selectedChildId!, month: selectedMonth },
    { enabled: !!selectedChildId }
  );

  if (authLoading || loadingChildren) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate statistics
  const totalLessons = logs?.length || 0;
  const presentCount = logs?.filter(l => l.status === "present").length || 0;
  const lateCount = logs?.filter(l => l.status === "late").length || 0;
  const absentCount = logs?.filter(l => l.status === "absent").length || 0;
  
  const attendanceRate = totalLessons > 0 
    ? Math.round(((presentCount + lateCount) / totalLessons) * 100) 
    : 0;

  return (
    <AdminShell title="Yoklama Takibi" subtitle="Aylık katılım detayları ve istatistikler">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Child Selector */}
        {children && children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
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
              </button>
            ))}
          </div>
        )}

        <div className="md:ml-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full md:w-48 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingLogs ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Aylık İstatistikler</h3>
              
              <div className="flex items-center justify-center mb-8">
                <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-8 border-slate-100">
                  <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      className={`${attendanceRate >= 80 ? "text-emerald-500" : attendanceRate >= 60 ? "text-amber-500" : "text-rose-500"}`}
                      strokeWidth="8"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * attendanceRate) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-800">%{attendanceRate}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Toplam Ders</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalLessons}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-800">Katıldı</span>
                  </div>
                  <span className="font-bold text-emerald-900">{presentCount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-semibold text-amber-800">Geç Kaldı</span>
                  </div>
                  <span className="font-bold text-amber-900">{lateCount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-sm font-semibold text-rose-800">Devamsız</span>
                  </div>
                  <span className="font-bold text-rose-900">{absentCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* List Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">Yoklama Kayıtları</h3>
              </div>
              
              {!logs || logs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  Bu aya ait yoklama kaydı bulunamadı.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {log.status === "present" ? (
                          <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        ) : log.status === "absent" ? (
                          <div className="p-2 rounded-full bg-rose-100 text-rose-600">
                            <XCircle className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                            <Clock className="h-5 w-5" />
                          </div>
                        )}
                        
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {log.session_date}
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {log.start_time?.slice(0, 5)} - {log.end_time?.slice(0, 5)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {log.class_name} · {log.teacher_name}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {log.status === "present" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Katıldı
                          </span>
                        ) : log.status === "absent" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Katılmadı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Geç Kaldı
                          </span>
                        )}
                        <div className="text-[10px] font-semibold text-slate-400 mt-1">
                          Round: {log.round_number}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

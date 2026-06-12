"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { Award, Loader2, Calendar, User, AlignLeft } from "lucide-react";

export default function ParentProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children, isLoading: loadingChildren } = trpc.parents.getMyChildren.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id);
    }
  }, [children, selectedChildId]);

  const { data: reports, isLoading: loadingReports } = trpc.parents.getChildProgressReports.useQuery(
    { student_id: selectedChildId! },
    { enabled: !!selectedChildId }
  );

  if (authLoading || loadingChildren) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminShell title="Gelişim Raporları" subtitle="Öğrenci gelişim raporları ve değerlendirmeler">
      {/* Child Selector */}
      {children && children.length > 1 && (
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
            </button>
          ))}
        </div>
      )}

      {loadingReports ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-12 text-center">
          <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Henüz Rapor Bulunmuyor</h3>
          <p className="text-sm text-slate-500 mt-2">Bu öğrenci için henüz bir gelişim raporu girilmemiş.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Seviye: {report.level_code}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" /> {report.report_date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">{report.score_overall}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Genel Skor</div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-700">Dinleme (Listening)</span>
                      <span className="font-bold text-slate-900">{report.score_listening}/100</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${report.score_listening}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-700">Konuşma (Speaking)</span>
                      <span className="font-bold text-slate-900">{report.score_speaking}/100</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${report.score_speaking}%` }}
                      />
                    </div>
                  </div>
                </div>

                {report.notes && (
                  <div className="mt-auto bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                      <AlignLeft className="h-3.5 w-3.5" /> Öğretmen Notu
                    </h4>
                    <p className="text-sm text-amber-900/80 italic leading-relaxed">"{report.notes}"</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Değerlendiren: <span className="font-semibold text-slate-700">{report.teacher_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

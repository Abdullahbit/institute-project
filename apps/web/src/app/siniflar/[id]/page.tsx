"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/admin-shell";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Loader2, 
  ArrowLeft, 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from "lucide-react";

export default function AdminClassRegisterInspectorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<"logs" | "attendance" | "reports">("logs");

  // Fetch Class details
  const { data: cls, isLoading: loadingClass } = trpc.classes.get.useQuery({ id });
  
  // Fetch Class sessions with daily logs
  const { data: sessions, isLoading: loadingSessions } = 
    trpc.classes.listClassSessionsWithLogs.useQuery({ class_id: id });

  // Fetch Class students roster
  const { data: studentsList, isLoading: loadingStudents } = 
    trpc.classes.listClassStudents.useQuery({ class_id: id });

  // Fetch Class attendance logs
  const { data: attendanceLogs, isLoading: loadingAttendance } = 
    trpc.students.getAttendanceLogs.useQuery({ class_id: id });

  // Fetch Term reports
  const { data: termReports, isLoading: loadingReports } = 
    trpc.classes.listTermReports.useQuery({ class_id: id });

  // Compile unique session dates and build attendance status map
  const attendanceMatrix = useMemo(() => {
    if (!studentsList || !sessions || !attendanceLogs) return { dates: [], matrix: {} };

    // Get sorted list of distinct completed session dates
    const completedSessions = sessions.filter(s => s.status === "completed" || s.checkout_at);
    const dates = Array.from(new Set(completedSessions.map(s => s.session_date))).sort((a, b) => b.localeCompare(a));

    const matrix: Record<string, Record<string, { status: string; notes?: string }>> = {};

    studentsList.forEach(student => {
      matrix[student.id] = {};
    });

    attendanceLogs.forEach(log => {
      if (matrix[log.student_id]) {
        matrix[log.student_id][log.session_date] = {
          status: log.status,
          notes: log.notes || undefined
        };
      }
    });

    return { dates, matrix };
  }, [studentsList, sessions, attendanceLogs]);

  // Find missing logs count for admin audit warning
  const missingLogsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.filter(s => (s.status === "completed" || s.checkout_at) && !s.description).length;
  }, [sessions]);

  const isLoading = loadingClass || loadingSessions || loadingStudents || loadingAttendance || loadingReports;

  return (
    <AdminShell
      title={cls ? `${cls.name} — Sınıf Defteri İnceleme` : "Sınıf Defteri İnceleme"}
      subtitle={language === "tr" ? "Yoklama, ders takip ve öğrenci dönem raporu denetleme alanı." : "Attendance, lesson logs, and student term reports audit workspace."}
    >
      <div className="max-w-5xl mx-auto pb-12 px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {language === "tr" ? "Geri Dön" : "Go Back"}
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-500">{language === "tr" ? "Yükleniyor..." : "Loading..."}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warning banner for admin auditing */}
            {missingLogsCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    {language === "tr" ? "Defter Kaydı Eksik Dersler Var" : "Missing Lesson Logs Detected"}
                  </h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Bu sınıfa ait tamamlanan {missingLogsCount} ders seansının içeriği eğitmen tarafından doldurulmamış.
                  </p>
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner max-w-md">
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-250"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                {language === "tr" ? "Ders Takip" : "Lesson Logs"}
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "attendance"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-250"
                }`}
              >
                <Users className="h-4 w-4" />
                {language === "tr" ? "Yoklama" : "Attendance"}
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-250"
                }`}
              >
                <FileText className="h-4 w-4" />
                {language === "tr" ? "Dönem Raporları" : "Term Reports"}
              </button>
            </div>

            {/* TAB 1: LESSON DAILY LOGS */}
            {activeTab === "logs" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">{language === "tr" ? "Tarih ve Saat" : "Date & Time"}</th>
                        <th className="px-6 py-4">{language === "tr" ? "Eğitmen" : "Teacher"}</th>
                        <th className="px-6 py-4">{language === "tr" ? "Ders İçeriği" : "Lesson Description"}</th>
                        <th className="px-6 py-4">{language === "tr" ? "Ödev" : "Homework"}</th>
                        <th className="px-6 py-4 text-center">{language === "tr" ? "Ders Saati" : "Hours"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sessions?.filter(s => s.status === "completed" || s.checkout_at).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                            {language === "tr" ? "Henüz tamamlanmış ders seansı bulunmuyor." : "No completed sessions found."}
                          </td>
                        </tr>
                      ) : (
                        sessions?.filter(s => s.status === "completed" || s.checkout_at).map((session) => (
                          <tr key={session.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-150">{session.session_date}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {session.start_time} - {session.end_time} ({session.room_name})
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span>{session.teacher_name}</span>
                                {session.is_cover && (
                                  <span className="text-[9px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40 px-1.5 py-0.5 rounded-full font-bold">
                                    {language === "tr" ? "Vekil" : "Cover"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {session.description ? (
                                <span className="text-slate-700 dark:text-slate-200 font-medium block max-w-sm break-words">
                                  {session.description}
                                </span>
                              ) : (
                                <span className="text-amber-600 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                  <AlertCircle className="h-3 w-3" /> {language === "tr" ? "Yazılmadı" : "Empty log"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {session.homework ? (
                                <span className="text-slate-600 dark:text-slate-350 font-medium block max-w-sm break-words">
                                  {session.homework}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-550 text-xs italic">
                                  {language === "tr" ? "Ödev verilmedi" : "No homework"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {session.hours_taught > 0 ? `${session.hours_taught} Saat` : "-"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: ATTENDANCE MATRIX */}
            {activeTab === "attendance" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    {language === "tr" ? "Yoklama Çizelgesi" : "Attendance Matrix"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "tr" 
                      ? "Tamamlanan ders tarihlerine göre öğrenci katılım durumunu inceleyin." 
                      : "Review student attendance records across all completed lesson sessions."}
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          {language === "tr" ? "Öğrenci Adı" : "Student Name"}
                        </th>
                        {attendanceMatrix.dates.map((date) => (
                          <th key={date} className="px-3 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-extrabold text-[10px] min-w-[90px]">
                            {date}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {studentsList?.length === 0 ? (
                        <tr>
                          <td colSpan={attendanceMatrix.dates.length + 1} className="px-4 py-8 text-center text-slate-400 font-medium italic">
                            {language === "tr" ? "Sınıfta kayıtlı öğrenci bulunmuyor." : "No students enrolled in this class."}
                          </td>
                        </tr>
                      ) : (
                        studentsList?.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/10 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                              {student.full_name}
                            </td>
                            {attendanceMatrix.dates.map((date) => {
                              const record = attendanceMatrix.matrix[student.id]?.[date];
                              return (
                                <td key={date} className="px-3 py-3 border-r border-slate-100 dark:border-slate-800 text-center whitespace-nowrap">
                                  {record ? (
                                    record.status === "present" ? (
                                      <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/40">
                                        <CheckCircle className="h-3 w-3" /> {language === "tr" ? "Katıldı" : "Present"}
                                      </span>
                                    ) : record.status === "absent" ? (
                                      <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 dark:bg-rose-955/20 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-100 dark:border-rose-900/40">
                                        <XCircle className="h-3 w-3" /> {language === "tr" ? "Gelmedi" : "Absent"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 text-amber-600 bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100 dark:border-amber-900/40">
                                        <Clock className="h-3 w-3" /> {language === "tr" ? "Geç" : "Late"}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-350 dark:text-slate-600 text-xs italic font-medium">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: TERM REPORTS */}
            {activeTab === "reports" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    {language === "tr" ? "Öğrenci Dönem Raporları" : "Student Term Reports"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "tr" 
                      ? "Eğitmenler tarafından yazılan dönem sonu notlarını ve gelişim raporlarını inceleyin." 
                      : "Review term evaluation reports and student feedback logged by teachers."}
                  </p>
                </div>

                <div className="space-y-4 mt-2">
                  {studentsList?.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium italic">
                      {language === "tr" ? "Sınıfta kayıtlı öğrenci bulunmuyor." : "No students enrolled in this class."}
                    </div>
                  ) : (
                    studentsList?.map((student) => {
                      const report = termReports?.find((r) => r.studentId === student.id);

                      return (
                        <div key={student.id} className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-150 text-sm">
                              {student.full_name}
                            </span>
                            {report && (
                              <span className="text-[10px] text-slate-400 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {language === "tr" ? "Yazan: " : "By: "} {report.teacherName}
                              </span>
                            )}
                          </div>

                          <div className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed font-medium bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                            {report ? (
                              <p className="whitespace-pre-line">{report.notes}</p>
                            ) : (
                              <span className="text-slate-450 italic">
                                {language === "tr" ? "Henüz dönem raporu yazılmamış." : "No term report written yet."}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

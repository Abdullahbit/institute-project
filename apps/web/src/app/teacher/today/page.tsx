"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/admin-shell";
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  User,
  BookOpen,
  Loader2,
  X
} from "lucide-react";

export default function TeacherTodayPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sandboxBypass, setSandboxBypass] = useState<boolean>(true); // Default to true for easy sandbox verification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yoklama ve karne durumları
  const logAttendance = trpc.students.logAttendance.useMutation();
  const submitProgressReport = trpc.students.submitProgressReport.useMutation();

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeClassName, setActiveClassName] = useState("");
  const [activeLevelCode, setActiveLevelCode] = useState("");

  const [rosterStates, setRosterStates] = useState<Record<string, { status: "present" | "absent" | "late", notes: string }>>({});
  const [reportStates, setReportStates] = useState<Record<string, {
    enable: boolean;
    score_listening: number;
    score_speaking: number;
    score_overall: number;
    notes: string;
  }>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (!loading && role && role !== "teacher") {
      router.push("/login");
    }
  }, [role, loading, router]);

  // 1. Fetch teacher record linked to authenticated user
  const { data: teachersList, isLoading: loadingTeachers } = trpc.teachers.list.useQuery(undefined, {
    enabled: !!user,
  });

  const activeTeacher = teachersList?.find((t) => t.user_id === user?.id);

  // 2. Fetch today's lessons using teacher_id
  const { 
    data: sessions, 
    isLoading: loadingSessions, 
    refetch, 
    isFetching 
  } = trpc.schedule.getTodaySessions.useQuery(
    { teacher_id: activeTeacher?.id || "" },
    { enabled: !!activeTeacher?.id }
  );

  // Fetch enrolled students of selected class
  const { data: classStudents, isLoading: loadingClassStudents } = trpc.classes.listClassStudents.useQuery(
    { class_id: activeClassId || "" },
    { enabled: !!activeClassId && attendanceModalOpen }
  );

  // Initialize form states when class roster is fetched
  useEffect(() => {
    if (classStudents) {
      const initialRoster: Record<string, { status: "present" | "absent" | "late", notes: string }> = {};
      const initialReports: Record<string, {
        enable: boolean;
        score_listening: number;
        score_speaking: number;
        score_overall: number;
        notes: string;
      }> = {};

      classStudents.forEach((student) => {
        initialRoster[student.id] = { status: "present", notes: "" };
        initialReports[student.id] = {
          enable: false,
          score_listening: 80,
          score_speaking: 80,
          score_overall: 80,
          notes: "",
        };
      });

      setRosterStates(initialRoster);
      setReportStates(initialReports);
    }
  }, [classStudents]);

  // tRPC Mutations
  const checkInMutation = trpc.schedule.checkIn.useMutation({
    onSuccess: () => {
      setSuccessMessage("Derse başarıyla giriş yapıldı!");
      setErrorMessage(null);
      refetch();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Giriş işlemi başarısız oldu.");
      setSuccessMessage(null);
    }
  });

  const checkOutMutation = trpc.schedule.checkOut.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(`Ders başarıyla sonlandırıldı! Süre: ${data.hours} saat. Saat kaydı otomatik oluşturuldu.`);
      setErrorMessage(null);
      setShowConfirmModal(false);
      refetch();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Çıkış işlemi başarısız oldu.");
      setSuccessMessage(null);
    }
  });

  const handleCheckIn = (sessionId: string, startTime: string) => {
    if (!sandboxBypass) {
      const now = new Date();
      const [hour, min] = startTime.split(":");
      const sessionStart = new Date();
      sessionStart.setHours(Number(hour), Number(min), 0, 0);
      const diffMs = Math.abs(now.getTime() - sessionStart.getTime());
      if (diffMs > 30 * 60 * 1000) {
        setErrorMessage("Derse giriş sadece başlangıç saatinden 30 dakika önce veya sonra yapılabilir.");
        return;
      }
    }

    checkInMutation.mutate({ session_id: sessionId });
  };

  const handleOpenCheckOut = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowConfirmModal(true);
  };

  const handleConfirmCheckOut = () => {
    if (!selectedSessionId) return;
    checkOutMutation.mutate({ session_id: selectedSessionId });
  };

  const handleOpenAttendance = (session: any) => {
    setActiveSessionId(session.id);
    setActiveClassId(session.class_id);
    setActiveClassName(session.class_name);
    setActiveLevelCode(session.level_code || "General-Course");
    setAttendanceError(null);
    setRosterStates({});
    setReportStates({});
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || !classStudents) return;

    setSavingAttendance(true);
    setAttendanceError(null);

    try {
      // 1. Submit Attendance Log
      const rosterList = classStudents.map((student) => ({
        student_id: student.id,
        status: rosterStates[student.id]?.status || "present",
        notes: rosterStates[student.id]?.notes || undefined,
      }));

      await logAttendance.mutateAsync({
        session_id: activeSessionId,
        roster: rosterList,
      });

      // 2. Submit Progress Reports for enabled students
      const teacherId = activeTeacher?.id;
      if (!teacherId) {
        throw new Error("Öğretmen kimliği bulunamadı.");
      }

      for (const student of classStudents) {
        const report = reportStates[student.id];
        if (report && report.enable) {
          await submitProgressReport.mutateAsync({
            student_id: student.id,
            teacher_id: teacherId,
            level_code: activeLevelCode,
            score_listening: Number(report.score_listening),
            score_speaking: Number(report.score_speaking),
            score_overall: Number(report.score_overall),
            notes: report.notes || undefined,
          });
        }
      }

      setSuccessMessage("Yoklama ve gelişim raporları başarıyla kaydedildi!");
      setAttendanceModalOpen(false);
      refetch();
    } catch (err: any) {
      setAttendanceError(err?.message || "Kayıt işlemi başarısız oldu.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Helper to determine status style
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ongoing":
      case "in_progress":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          text: "Devam Ediyor",
          indicator: "bg-emerald-500 animate-pulse",
        };
      case "completed":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          text: "Tamamlandı",
          indicator: "bg-indigo-500",
        };
      case "late":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          text: "Gecikme",
          indicator: "bg-amber-500",
        };
      case "no_show":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          text: "Gelmedi",
          indicator: "bg-rose-500",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          text: "Planlandı",
          indicator: "bg-slate-500",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm font-medium text-slate-500">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const pageLoading = loadingTeachers || loadingSessions;

  return (
    <AdminShell 
      title="Bugünkü Derslerim" 
      subtitle="Günlük ders programınız ve giriş/çıkış (check-in/out) işlemleriniz."
    >
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Sandbox Override Panel */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse"></span>
            <div>
              <span className="text-xs font-bold text-slate-700">Sandbox Test Modu</span>
              <p className="text-[10px] text-slate-500">Kolay test için 30 dakika sınırlamasını devre dışı bırakır.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={sandboxBypass} 
              onChange={(e) => setSandboxBypass(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>

        {/* Global Feedback Messages */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title Section / Action Row */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Bugünkü Dersleriniz</h2>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {/* Loading skeleton */}
        {pageLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-white border border-slate-200/60 shadow-sm rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200/60 rounded-xl p-12 text-center flex flex-col items-center gap-4 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 text-xl shadow-inner">
              📅
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Bugün dersiniz bulunmamaktadır</h3>
              <p className="text-xs text-slate-500 mt-1">Geri çekilin ve günün keyfini çıkarın!</p>
            </div>
          </div>
        ) : (
          /* Classes List */
          <div className="flex flex-col gap-4">
            {sessions.map((session) => {
              const statusConfig = getStatusConfig(session.status);
              const isScheduled = session.status === "scheduled" || session.status === "late";
              const isOngoing = session.status === "ongoing" || session.status === "in_progress";
              const isCompleted = session.status === "completed";

              return (
                <div 
                  key={session.id}
                  className={`bg-white border rounded-xl p-6 transition-all duration-300 flex flex-col gap-5 ${
                    isOngoing 
                      ? "border-emerald-500/30 shadow-md shadow-emerald-500/5 bg-emerald-50/10" 
                      : "border-slate-200/60 shadow-sm"
                  }`}
                >
                  {/* Card Header Info */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Grup Dersi
                        </span>
                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.indicator}`}></span>
                          {statusConfig.text}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight mt-1">{session.class_name}</h3>
                    </div>

                    <div className="text-right flex flex-col gap-1">
                      <span className="text-xs text-slate-700 font-mono flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {session.time_label}
                      </span>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Derslik</p>
                        <p className="font-semibold text-slate-700 mt-0.5">Sınıf A</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Öğretmen</p>
                        <p className="font-semibold text-slate-700 mt-0.5">{session.teacher_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-1">
                    {isScheduled && (
                      <button
                        onClick={() => handleCheckIn(session.id, session.time_label.split(" - ")[0])}
                        disabled={checkInMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-3.5 px-4 rounded-lg transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        {checkInMutation.isPending && selectedSessionId === session.id 
                          ? "Giriş Yapılıyor..." 
                          : "DERSİ BAŞLAT (CHECK IN)"}
                      </button>
                    )}

                    {isOngoing && (
                      <div className="flex flex-col gap-2.5">
                        <button
                          onClick={() => handleOpenAttendance(session)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3.5 px-4 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="h-4 w-4" />
                          YOKLAMA AL & KARNE YAZ
                        </button>
                        <button
                          onClick={() => handleOpenCheckOut(session.id)}
                          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold py-3.5 px-4 rounded-lg transition-all shadow-sm hover:shadow active:scale-[0.99]"
                        >
                          DERSİ BİTİR (CHECK OUT)
                        </button>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="bg-slate-50 border border-slate-200 text-slate-500 text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium">
                        <CheckCircle className="h-4 w-4 text-indigo-500" />
                        Saat kaydı otomatik olarak oluşturuldu.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yoklama ve Değerlendirme Modali */}
      {attendanceModalOpen && activeSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setAttendanceModalOpen(false)}
          />
          <div 
            className="relative bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Yoklama ve Gelişim Girişi</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{activeClassName} sınıfı günlük yoklama listesi.</p>
              </div>
              <button 
                onClick={() => setAttendanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {attendanceError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shrink-0">
                {attendanceError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {loadingClassStudents ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 font-medium">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Öğrenci listesi yükleniyor...
                </div>
              ) : !classStudents || classStudents.length === 0 ? (
                <p className="text-xs text-slate-450 italic text-center py-8">Bu sınıfa henüz hiç öğrenci kaydedilmemiş.</p>
              ) : (
                <form onSubmit={handleSaveAttendance} className="space-y-6">
                  {classStudents.map((student) => {
                    const rState = rosterStates[student.id] || { status: "present", notes: "" };
                    const repState = reportStates[student.id] || { enable: false, score_listening: 80, score_speaking: 80, score_overall: 80, notes: "" };

                    return (
                      <div key={student.id} className="border border-slate-200/60 rounded-xl p-4 bg-slate-50/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-sm">{student.full_name}</span>
                          
                          {/* Yoklama Butonları */}
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 select-none">
                            {[
                              { val: "present", label: "Derste", bg: "peer-checked:bg-emerald-500/10 peer-checked:text-emerald-700 peer-checked:border-emerald-200" },
                              { val: "absent", label: "Gelmedi", bg: "peer-checked:bg-rose-500/10 peer-checked:text-rose-700 peer-checked:border-rose-200" },
                              { val: "late", label: "Geç Kaldı", bg: "peer-checked:bg-amber-500/10 peer-checked:text-amber-700 peer-checked:border-amber-200" }
                            ].map((opt) => (
                              <label key={opt.val} className="relative cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${student.id}`}
                                  value={opt.val}
                                  checked={rState.status === opt.val}
                                  onChange={() => {
                                    setRosterStates((prev) => ({
                                      ...prev,
                                      [student.id]: { ...prev[student.id], status: opt.val as any },
                                    }));
                                  }}
                                  className="sr-only peer"
                                />
                                <span className={`text-[11px] font-semibold text-slate-500 px-3 py-1.5 rounded-md border border-transparent hover:bg-slate-50 transition-all block peer-checked:shadow-sm ${opt.bg}`}>
                                  {opt.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Yoklama Notu Girişi */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Yoklama notu (örn: 10 dk geç geldi, erken ayrıldı)"
                            value={rState.notes}
                            onChange={(e) => {
                              setRosterStates((prev) => ({
                                ...prev,
                                [student.id]: { ...prev[student.id], notes: e.target.value },
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                          />
                        </div>

                        {/* Karne Girişi Aç/Kapa */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`report-chk-${student.id}`}
                            checked={repState.enable}
                            onChange={(e) => {
                              setReportStates((prev) => ({
                                ...prev,
                                [student.id]: { ...prev[student.id], enable: e.target.checked },
                              }));
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4.5 w-4.5"
                          />
                          <label htmlFor={`report-chk-${student.id}`} className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                            Bugünkü ders için Karne / Gelişim Raporu ekle
                          </label>
                        </div>

                        {/* Rapor Detayları (Açık ise) */}
                        {repState.enable && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in text-xs">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 block">Dinleme Skoru (0-100)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={repState.score_listening}
                                onChange={(e) => {
                                  setReportStates((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], score_listening: Number(e.target.value) },
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary focus:bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 block">Konuşma Skoru (0-100)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={repState.score_speaking}
                                onChange={(e) => {
                                  setReportStates((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], score_speaking: Number(e.target.value) },
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary focus:bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 block">Genel Skor (0-100)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={repState.score_overall}
                                onChange={(e) => {
                                  setReportStates((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], score_overall: Number(e.target.value) },
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary focus:bg-white"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label className="font-bold text-slate-500 block">Öğretmen Değerlendirme Notu</label>
                              <textarea
                                placeholder="Öğrencinin dersteki performansı hakkında değerlendirme notu..."
                                value={repState.notes}
                                onChange={(e) => {
                                  setReportStates((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], notes: e.target.value },
                                  }));
                                }}
                                rows={2}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary focus:bg-white placeholder-slate-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAttendanceModalOpen(false)}
                      disabled={savingAttendance}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={savingAttendance}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingAttendance ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        "Yoklama ve Karneleri Kaydet"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-white border border-slate-200/60 rounded-xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-900 text-base mb-2">Dersi Sonlandır?</h3>
            <p className="text-xs text-slate-500 leading-normal mb-5">
              Bu ders seansını tamamlamak istediğinizden emin misiniz? Sistem geçen süreyi hesaplayacak ve otomatik bir saat kaydı oluşturacaktır.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckOut}
                disabled={checkOutMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                {checkOutMutation.isPending ? "Tamamlanıyor..." : "Dersi Bitir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

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
  X,
  ClipboardCheck,
  Check,
  Star
} from "lucide-react";

const ROUND_LABELS = ["1. Tur", "2. Tur", "3. Tur", "4. Tur"];

export default function TeacherTodayPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sandboxBypass, setSandboxBypass] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attendance modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeClassName, setActiveClassName] = useState("");
  const [activeLevelCode, setActiveLevelCode] = useState("");
  const [activeRound, setActiveRound] = useState(1); // 1-4
  // Per-round roster states: roundStates[roundNum][studentId] = {status, notes}
  const [roundStates, setRoundStates] = useState<Record<number, Record<string, { status: "present" | "absent" | "late"; notes: string }>>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [submittedRounds, setSubmittedRounds] = useState<number[]>([]);

  // Progress report states
  const [reportStates, setReportStates] = useState<Record<string, {
    enable: boolean;
    score_listening: number;
    score_speaking: number;
    score_overall: number;
    notes: string;
  }>>({});

  const logAttendance = trpc.students.logAttendance.useMutation();
  const submitProgressReport = trpc.students.submitProgressReport.useMutation();
  const submitBehaviorFeedback = trpc.parents.submitBehaviorFeedback.useMutation();

  // Behavior feedback states
  const [behaviorModalOpen, setBehaviorModalOpen] = useState(false);
  const [behaviorStudentId, setBehaviorStudentId] = useState<string | null>(null);
  const [behaviorStudentName, setBehaviorStudentName] = useState("");
  const [behaviorCategory, setBehaviorCategory] = useState<"excellent" | "good" | "warning" | "issue">("good");
  const [behaviorTitle, setBehaviorTitle] = useState("");
  const [behaviorDescription, setBehaviorDescription] = useState("");
  const [behaviorSuccess, setBehaviorSuccess] = useState<string | null>(null);

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

  // 2. Fetch today's lessons
  const { 
    data: sessions, 
    isLoading: loadingSessions, 
    refetch, 
    isFetching 
  } = trpc.schedule.getTodaySessions.useQuery(
    { teacher_id: activeTeacher?.id || "" },
    { enabled: !!activeTeacher?.id }
  );

  // 3. Fetch class students (when modal opens)
  const { data: classStudents, isLoading: loadingClassStudents } = trpc.classes.listClassStudents.useQuery(
    { class_id: activeClassId || "" },
    { enabled: !!activeClassId && attendanceModalOpen }
  );

  // 4. Fetch already-submitted rounds for the active session
  const { data: serverSubmittedRounds, refetch: refetchRounds } = trpc.students.getSessionRounds.useQuery(
    { session_id: activeSessionId || "" },
    { enabled: !!activeSessionId && attendanceModalOpen }
  );

  // Sync submitted rounds from server
  useEffect(() => {
    if (serverSubmittedRounds) {
      setSubmittedRounds(serverSubmittedRounds);
    }
  }, [serverSubmittedRounds]);

  // Initialize per-round roster when class students load
  useEffect(() => {
    if (classStudents && classStudents.length > 0) {
      const initialRound: Record<string, { status: "present" | "absent" | "late"; notes: string }> = {};
      const initialReports: typeof reportStates = {};
      classStudents.forEach((student) => {
        initialRound[student.id] = { status: "present", notes: "" };
        initialReports[student.id] = {
          enable: false,
          score_listening: 80,
          score_speaking: 80,
          score_overall: 80,
          notes: "",
        };
      });
      // Initialize all 4 rounds
      setRoundStates({ 1: { ...initialRound }, 2: { ...initialRound }, 3: { ...initialRound }, 4: { ...initialRound } });
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
      setShowConfirmModal(false);
    }
  });

  const generateDemoMutation = trpc.schedule.generateDemoSessionsForToday.useMutation({
    onSuccess: () => {
      setSuccessMessage("Bugünün demo dersleri başarıyla oluşturuldu/güncellendi.");
      refetch();
    }
  });

  const handleCheckIn = (sessionId: string, startTime: string) => {
    // Time restriction removed: teachers can check in anytime
    checkInMutation.mutate({ session_id: sessionId });
  };

  const handleOpenCheckOut = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowConfirmModal(true);
  };

  const handleOpenBehaviorModal = (studentId: string, studentName: string) => {
    setBehaviorStudentId(studentId);
    setBehaviorStudentName(studentName);
    setBehaviorCategory("good");
    setBehaviorTitle("");
    setBehaviorDescription("");
    setBehaviorSuccess(null);
    setBehaviorModalOpen(true);
  };

  const handleSubmitBehavior = async () => {
    if (!behaviorStudentId || !behaviorTitle) return;

    try {
      await submitBehaviorFeedback.mutateAsync({
        student_id: behaviorStudentId,
        lesson_session_id: activeSessionId || undefined,
        category: behaviorCategory,
        title: behaviorTitle,
        description: behaviorDescription,
      });

      setBehaviorSuccess("Davranış notu başarıyla kaydedildi!");
      setTimeout(() => {
        setBehaviorModalOpen(false);
        setBehaviorSuccess(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Davranış notu kaydedilemedi.");
    }
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
    setActiveRound(1);
    setRoundStates({});
    setReportStates({});
    setSubmittedRounds([]);
    setAttendanceModalOpen(true);
  };

  const handleSaveRound = async () => {
    if (!activeSessionId || !classStudents) return;

    setSavingAttendance(true);
    setAttendanceError(null);

    try {
      const currentRoundState = roundStates[activeRound] || {};
      const rosterList = classStudents.map((student) => ({
        student_id: student.id,
        status: currentRoundState[student.id]?.status || "present",
        notes: currentRoundState[student.id]?.notes || undefined,
      }));

      await (logAttendance.mutateAsync as any)({
        session_id: activeSessionId,
        round_number: activeRound,
        roster: rosterList,
      });

      setSubmittedRounds((prev) => prev.includes(activeRound) ? prev : [...prev, activeRound].sort());
      refetchRounds();

      // If last round, also save progress reports
      if (activeRound === 4) {
        const teacherId = activeTeacher?.id;
        if (teacherId) {
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
        }
        setSuccessMessage(`${activeClassName} — Tüm 4 tur yoklaması ve karne notları kaydedildi!`);
        setAttendanceModalOpen(false);
        refetch();
      } else {
        // Move to next round automatically
        setActiveRound(activeRound + 1);
      }
    } catch (err: any) {
      setAttendanceError(err?.message || "Kayıt işlemi başarısız oldu.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const setStudentStatus = (studentId: string, status: "present" | "absent" | "late") => {
    setRoundStates((prev) => ({
      ...prev,
      [activeRound]: {
        ...(prev[activeRound] || {}),
        [studentId]: { ...(prev[activeRound]?.[studentId] || { status: "present", notes: "" }), status },
      },
    }));
  };

  const setStudentNote = (studentId: string, notes: string) => {
    setRoundStates((prev) => ({
      ...prev,
      [activeRound]: {
        ...(prev[activeRound] || {}),
        [studentId]: { ...(prev[activeRound]?.[studentId] || { status: "present", notes: "" }), notes },
      },
    }));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ongoing":
      case "in_progress":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "Devam Ediyor", indicator: "bg-emerald-500 animate-pulse" };
      case "completed":
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", text: "Tamamlandı", indicator: "bg-indigo-500" };
      case "late":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "Gecikme", indicator: "bg-amber-500" };
      case "no_show":
        return { bg: "bg-rose-50 text-rose-700 border-rose-200", text: "Gelmedi", indicator: "bg-rose-500" };
      default:
        return { bg: "bg-slate-100 text-slate-700 border-slate-200", text: "Planlandı", indicator: "bg-slate-500" };
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

        {/* Title Section */}
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
          <div className="bg-white border border-slate-200/60 rounded-xl p-12 text-center flex flex-col items-center gap-4 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 text-xl shadow-inner">
              📅
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Bugün dersiniz bulunmamaktadır</h3>
              <p className="text-xs text-slate-500 mt-1">Geri çekilin ve günün keyfini çıkarın!</p>
            </div>
            {sandboxBypass && (
              <button
                onClick={() => generateDemoMutation.mutate()}
                disabled={generateDemoMutation.isPending}
                className="mt-4 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-sm"
              >
                {generateDemoMutation.isPending ? "Oluşturuluyor..." : "TEST: Bugünkü Dersleri Oluştur"}
              </button>
            )}
          </div>
        ) : (
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
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Grup Dersi
                        </span>
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

                  {/* Card Body */}
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
                          <ClipboardCheck className="h-4 w-4" />
                          YOKLAMA AL (4 TUR)
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

      {/* ─── Yoklama Modal — 4 Tur ─── */}
      {attendanceModalOpen && activeSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setAttendanceModalOpen(false)}
          />
          <div 
            className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  Yoklama Al
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{activeClassName} — Her derste 4 tur yoklama alınır.</p>
              </div>
              <button 
                onClick={() => setAttendanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Round Tab Selector */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              {[1, 2, 3, 4].map((round) => {
                const isDone = submittedRounds.includes(round);
                const isActive = activeRound === round;
                return (
                  <button
                    key={round}
                    onClick={() => setActiveRound(round)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      isDone
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isActive
                        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary animate-pulse" : "bg-slate-300"}`} />
                    )}
                    {ROUND_LABELS[round - 1]}
                  </button>
                );
              })}
            </div>

            {/* Error */}
            {attendanceError && (
              <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shrink-0">
                {attendanceError}
              </div>
            )}

            {/* Student List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingClassStudents ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 font-medium">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Öğrenci listesi yükleniyor...
                </div>
              ) : !classStudents || classStudents.length === 0 ? (
                <p className="text-xs text-slate-450 italic text-center py-8">Bu sınıfa henüz hiç öğrenci kaydedilmemiş.</p>
              ) : (
                <>
                  {/* Round label */}
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-1">
                    {ROUND_LABELS[activeRound - 1]} Yoklaması
                    {submittedRounds.includes(activeRound) && (
                      <span className="ml-2 text-emerald-600 font-semibold normal-case">✓ Kaydedildi</span>
                    )}
                  </div>

                  {classStudents.map((student) => {
                    const sState = roundStates[activeRound]?.[student.id] || { status: "present" as const, notes: "" };
                    return (
                      <div key={student.id} className="border border-slate-200/70 rounded-xl p-4 bg-slate-50/40 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{student.full_name}</span>
                            <button
                              onClick={() => handleOpenBehaviorModal(student.id, student.full_name)}
                              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                              title="Davranış Notu Ekle"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Status Toggle */}
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 select-none">
                            {[
                              { val: "present" as const, label: "Var", activeClass: "bg-emerald-500 text-white shadow-sm" },
                              { val: "absent" as const, label: "Yok", activeClass: "bg-rose-500 text-white shadow-sm" },
                              { val: "late" as const, label: "Geç", activeClass: "bg-amber-500 text-white shadow-sm" },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setStudentStatus(student.id, opt.val)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                  sState.status === opt.val
                                    ? opt.activeClass
                                    : "text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Note input */}
                        <input
                          type="text"
                          placeholder="Not ekle (isteğe bağlı)"
                          value={sState.notes}
                          onChange={(e) => setStudentNote(student.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                        />

                        {/* Progress report (only on last round) */}
                        {activeRound === 4 && (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`report-chk-${student.id}`}
                                checked={reportStates[student.id]?.enable || false}
                                onChange={(e) =>
                                  setReportStates((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], enable: e.target.checked },
                                  }))
                                }
                                className="rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <label htmlFor={`report-chk-${student.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                                Karne / Gelişim Raporu ekle
                              </label>
                            </div>
                            {reportStates[student.id]?.enable && (
                              <div className="grid grid-cols-3 gap-3 bg-white border border-slate-200 p-3 rounded-xl text-xs">
                                {[
                                  { key: "score_listening" as const, label: "Dinleme (0-100)" },
                                  { key: "score_speaking" as const, label: "Konuşma (0-100)" },
                                  { key: "score_overall" as const, label: "Genel (0-100)" },
                                ].map((s) => (
                                  <div key={s.key} className="space-y-1">
                                    <label className="font-bold text-slate-500 block">{s.label}</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={reportStates[student.id]?.[s.key] ?? 80}
                                      onChange={(e) =>
                                        setReportStates((prev) => ({
                                          ...prev,
                                          [student.id]: { ...prev[student.id], [s.key]: Number(e.target.value) },
                                        }))
                                      }
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary"
                                    />
                                  </div>
                                ))}
                                <div className="col-span-3 space-y-1">
                                  <label className="font-bold text-slate-500 block">Değerlendirme Notu</label>
                                  <textarea
                                    placeholder="Öğrencinin performansı hakkında not..."
                                    value={reportStates[student.id]?.notes || ""}
                                    onChange={(e) =>
                                      setReportStates((prev) => ({
                                        ...prev,
                                        [student.id]: { ...prev[student.id], notes: e.target.value },
                                      }))
                                    }
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-primary placeholder-slate-400"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                {submittedRounds.length}/4 tur tamamlandı
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  disabled={savingAttendance}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={handleSaveRound}
                  disabled={savingAttendance || !classStudents || classStudents.length === 0}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
                    activeRound === 4
                      ? "bg-indigo-600 hover:bg-indigo-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {savingAttendance ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : activeRound === 4 ? (
                    "4. Turu Kaydet & Bitir"
                  ) : (
                    `${ROUND_LABELS[activeRound - 1]}'u Kaydet → ${ROUND_LABELS[activeRound]}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-white border border-slate-200/60 rounded-xl w-full max-w-md p-6 shadow-xl">
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

      {/* ─── Davranış Notu Modal ─── */}
      {behaviorModalOpen && behaviorStudentId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setBehaviorModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Davranış Notu Ekle</h2>
                <p className="text-xs text-slate-500">{behaviorStudentName}</p>
              </div>
              <button 
                onClick={() => setBehaviorModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {behaviorSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-emerald-600">
                  <CheckCircle className="h-12 w-12 mb-3" />
                  <p className="font-bold">{behaviorSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                    <select
                      value={behaviorCategory}
                      onChange={(e) => setBehaviorCategory(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="excellent">Mükemmel (Örn: Çok iyi katılım)</option>
                      <option value="good">İyi (Örn: Dersi dinledi)</option>
                      <option value="warning">Dikkat (Örn: Dikkati dağınıktı)</option>
                      <option value="issue">Sorun (Örn: Derse katılmadı)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kısa Başlık</label>
                    <input
                      type="text"
                      value={behaviorTitle}
                      onChange={(e) => setBehaviorTitle(e.target.value)}
                      placeholder="Örn: Harika performans"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Detaylı Açıklama (İsteğe Bağlı)</label>
                    <textarea
                      value={behaviorDescription}
                      onChange={(e) => setBehaviorDescription(e.target.value)}
                      placeholder="Velinin görmesi için detaylı not ekleyebilirsiniz..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    onClick={handleSubmitBehavior}
                    disabled={!behaviorTitle || submitBehaviorFeedback.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {submitBehaviorFeedback.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Davranış Notunu Kaydet"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

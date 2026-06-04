"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { trpc } from "@/lib/trpc";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  ArrowLeft,
  User,
  BookOpen
} from "lucide-react";

export default function TeacherTodayPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(10);
  const [sandboxBypass, setSandboxBypass] = useState<boolean>(true); // Default to true for easy sandbox verification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (role && role !== "teacher") {
      router.push("/login");
    }
  }, [role, router]);

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
    // Optional sandbox bypass check
    if (!sandboxBypass) {
      // Check ±30 minutes window
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

  // Helper to determine status style
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ongoing":
      case "in_progress":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          text: "Devam Ediyor",
          indicator: "bg-emerald-400 animate-pulse",
        };
      case "completed":
        return {
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          text: "Tamamlandı",
          indicator: "bg-indigo-400",
        };
      case "late":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          text: "Gecikme",
          indicator: "bg-amber-400",
        };
      case "no_show":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          text: "Gelmedi",
          indicator: "bg-rose-400",
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          text: "Planlandı",
          indicator: "bg-slate-400",
        };
    }
  };

  const pageLoading = loadingTeachers || loadingSessions;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/teacher/dashboard")}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight">Bugünkü Derslerim</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">LingoFlow Teacher Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400 font-semibold">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Eğitmen</p>
          </div>
          <button
            onClick={logout}
            className="text-xs bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/40 text-rose-400 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-medium"
          >
            <LogOut className="h-3.5 w-3.5" />
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col gap-6 z-10">
        
        {/* Sandbox Override Panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-violet-500"></span>
            <div>
              <span className="text-xs font-bold text-slate-300">Sandbox Test Modu</span>
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
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>

        {/* Global Feedback Messages */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title Section */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Bugünkü Programınız</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sınıfa ulaştığınızda giriş, ders bitiminde çıkış yapınız.</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {/* Loading skeleton */}
        {pageLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-slate-900/40 border border-slate-900 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 text-xl">
              📅
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Bugün dersiniz bulunmamaktadır</h3>
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
                  className={`bg-slate-900/40 border rounded-3xl p-6 transition-all duration-300 flex flex-col gap-5 ${
                    isOngoing 
                      ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5 bg-slate-900/60" 
                      : "border-slate-800/80"
                  }`}
                >
                  {/* Card Header Info */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Grup Dersi
                        </span>
                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.indicator}`}></span>
                          {statusConfig.text}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight mt-1">{session.class_name}</h3>
                    </div>

                    <div className="text-right flex flex-col gap-1">
                      <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 bg-slate-950/60 border border-slate-900/60 px-2.5 py-1 rounded-xl">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {session.time_label}
                      </span>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Derslik</p>
                        <p className="font-semibold text-slate-300 mt-0.5">Sınıf A</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Öğretmen</p>
                        <p className="font-semibold text-slate-300 mt-0.5">{session.teacher_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-1">
                    {isScheduled && (
                      <button
                        onClick={() => handleCheckIn(session.id, session.time_label.split(" - ")[0])}
                        disabled={checkInMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {checkInMutation.isPending && selectedSessionId === session.id 
                          ? "Giriş Yapılıyor..." 
                          : "DERSİ BAŞLAT (CHECK IN)"}
                      </button>
                    )}

                    {isOngoing && (
                      <button
                        onClick={() => handleOpenCheckOut(session.id)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98]"
                      >
                        DERSİ BİTİR (CHECK OUT)
                      </button>
                    )}

                    {isCompleted && (
                      <div className="bg-slate-950/60 border border-slate-900 text-slate-500 text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium">
                        <CheckCircle className="h-4 w-4 text-indigo-400" />
                        Saat kaydı otomatik olarak oluşturuldu.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-white text-base mb-2">Dersi Sonlandır?</h3>
            <p className="text-xs text-slate-400 leading-normal mb-5">
              Bu ders seansını tamamlamak istediğinizden emin misiniz? Sistem geçen süreyi hesaplayacak ve otomatik bir saat kaydı oluşturacaktır.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-900 hover:bg-slate-800/50 text-slate-400 text-xs font-semibold rounded-xl transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckOut}
                disabled={checkOutMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {checkOutMutation.isPending ? "Tamamlanıyor..." : "Dersi Bitir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { 
  BookOpen, 
  Shield, 
  Clock, 
  GraduationCap, 
  ChevronRight, 
  Plus, 
  X, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  MapPin,
  Coffee,
  CalendarDays,
  Eye,
  Edit3,
  ChevronLeft
} from "lucide-react";

const daysOfWeekMap = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar"
];

const classTypeLabels = {
  group: "Grup Dersi",
  private: "Özel Ders",
  online: "Online Ders"
};

const statusDetails = {
  pending: { label: "Beklemede", color: "text-amber-700 bg-amber-50 border-amber-200" },
  approved: { label: "Onaylandı", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  rejected: { label: "Reddedildi", color: "text-rose-700 bg-rose-50 border-rose-200" },
};

function getDayOfWeekIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export default function TeacherDashboard() {
  const { language, t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const { data: openSubstitutes, refetch: refetchSubstitutes } = trpc.alerts.getOpenSubstituteRequests.useQuery();
  const respondMutation = trpc.alerts.respondToSubstituteRequest.useMutation();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const weekdays = useMemo(() => {
    return language === "tr"
      ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  }, [language]);

  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayIndex = getDayOfWeekIndex(firstDayOfMonth);
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month padding days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const date = new Date(year, month, i);
      cells.push({ date, isCurrentMonth: true });
    }
    
    // Next month padding days
    let nextMonthDay = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, nextMonthDay++);
      cells.push({ date, isCurrentMonth: false });
    }
    
    return cells;
  }, [currentDate]);

  // Subscribe to cover requests Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("teacher-alerts")
      .on("broadcast", { event: "substitute_request_created" }, () => {
        refetchSubstitutes();
      })
      .on("broadcast", { event: "substitute_request_resolved" }, () => {
        refetchSubstitutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSubstitutes]);

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [classType, setClassType] = useState<"group" | "private" | "online">("group");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [activeHourTab, setActiveHourTab] = useState<"all" | "pending" | "approved">("all");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewingAuditLog, setViewingAuditLog] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; lessons: any[] } | null>(null);

  // Protect route
  useEffect(() => {
    if (!loading && role && role !== 'teacher') {
      router.push('/login');
    }
  }, [role, loading, router]);

  // 1. Fetch teacher record linked to authenticated user
  const { data: teachersList, isLoading: loadingTeachers } = trpc.teachers.list.useQuery(undefined, {
    enabled: !!user && role === "teacher",
  });

  const activeTeacher = teachersList?.find((t) => t.user_id === user?.id);

  // 2. Fetch schedule slots for the teacher
  const { data: slots, isLoading: loadingSlots, refetch: refetchSlots } = trpc.classes.listSlots.useQuery(
    { teacher_id: activeTeacher?.id },
    { enabled: !!activeTeacher?.id }
  );

  // Generate actual lesson occurrences for the visible calendar cells
  const actualOccurrences = useMemo(() => {
    if (!slots || slots.length === 0 || calendarCells.length === 0) return [];
    
    // Find the latest date in the calendar cells to cap our generation loop
    const maxDate = new Date(calendarCells[calendarCells.length - 1].date);
    maxDate.setHours(23, 59, 59, 999);

    // Group the slots by class
    const slotsByClass: Record<string, typeof slots> = {};
    for (const slot of slots) {
      if (!slotsByClass[slot.class_id]) {
        slotsByClass[slot.class_id] = [];
      }
      slotsByClass[slot.class_id].push(slot);
    }

    const occurrences: Array<typeof slots[0] & { dateStr: string; date: Date }> = [];

    // For each class, generate occurrences from its creation date up to maxDate
    for (const classId of Object.keys(slotsByClass)) {
      const classSlots = slotsByClass[classId];
      const firstSlot = classSlots[0];
      const quantity = (firstSlot as any).class_quantity || 0;
      const quantityType = (firstSlot as any).class_quantity_type || "classes";
      
      const creationDate = new Date((firstSlot as any).class_created_at);
      creationDate.setHours(0, 0, 0, 0);

      // Start loop from the creation date
      let loopDate = new Date(creationDate);
      let count = 0;
      let hours = 0;

      // We'll loop up to maxDate, incrementing day-by-day.
      // To avoid infinite loops in case of corrupt dates, cap at 365 days max.
      const capDate = new Date(creationDate);
      capDate.setDate(capDate.getDate() + 365);
      const loopCap = maxDate < capDate ? maxDate : capDate;

      while (loopDate <= loopCap) {
        const dayOfWeekIndex = getDayOfWeekIndex(loopDate);
        // Find slots for this day of week
        const daySlots = classSlots.filter((s) => Number(s.day_of_week) === dayOfWeekIndex)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        for (const slot of daySlots) {
          // If we have a limit set, check if we've reached it
          if (quantity > 0) {
            if (quantityType === "classes" && count >= quantity) {
              break;
            }
            if (quantityType === "hours" && hours >= quantity) {
              break;
            }
          }

          // Calculate duration in hours
          const [sh, sm] = slot.start_time.split(":").map(Number);
          const [eh, em] = slot.end_time.split(":").map(Number);
          const duration = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

          // Record this occurrence
          occurrences.push({
            ...slot,
            date: new Date(loopDate),
            dateStr: loopDate.toDateString(),
          });

          count += 1;
          hours += duration;
        }

        // Move to next day
        loopDate.setDate(loopDate.getDate() + 1);
      }
    }

    return occurrences;
  }, [slots, calendarCells]);

  // 3. Fetch teacher's hour logs
  const { data: hourLogs, isLoading: loadingHours, refetch: refetchHours } = trpc.hours.getMyHourLogs.useQuery(
    undefined,
    { enabled: role === "teacher" }
  );

  // 4. Mutation to create manual hour log
  const createHourLogMutation = trpc.hours.createManualHourLog.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
      setNotes("");
      setSubmitError(null);
      refetchHours();
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
      }, 1500);
    },
    onError: (err) => {
      setSubmitError(err.message || "Saat raporu gönderilirken bir hata oluştu.");
    }
  });

  const updateHourLogMutation = trpc.hours.updateHourLog.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
      setNotes("");
      setSubmitError(null);
      refetchHours();
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setEditingLogId(null);
      }, 1500);
    },
    onError: (err) => {
      setSubmitError(err.message || "Saat raporu güncellenirken bir hata oluştu.");
    }
  });

  const handleSubmitHourLog = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (editingLogId) {
      updateHourLogMutation.mutate({
        log_id: editingLogId,
        data: {
          log_date: logDate,
          class_type: classType,
          duration_minutes: Number(durationMinutes),
          notes: notes || undefined,
        }
      });
    } else {
      createHourLogMutation.mutate({
        log_date: logDate,
        class_type: classType,
        duration_minutes: Number(durationMinutes),
        notes: notes || undefined,
      });
    }
  };

  // Statistics calculations
  const totalApprovedHours = hourLogs
    ?.filter((l) => l.status === "approved")
    .reduce((sum, l) => sum + l.hours, 0) || 0;

  const totalPendingHours = hourLogs
    ?.filter((l) => l.status === "pending")
    .reduce((sum, l) => sum + l.hours, 0) || 0;

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

  return (
    <AdminShell 
      title="Ana Sayfa" 
      subtitle="Eğitmen genel özet ve çalışma alanı."
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4">
        {/* Karşılama Kartı */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col gap-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-tr from-primary/10 to-blue-500/10 rounded-full blur-2xl"></div>
          <h2 className="text-xl font-bold text-slate-900">
            Tekrar hoş geldiniz, {user?.user_metadata?.full_name || 'Eğitmen'}!
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Eğitmen portalınız aktif durumdadır. Buradan ders programınızı takip edebilir, derslerinize giriş/çıkış (check-in/out) işlemlerini yapabilir ve ders saatlerinizi raporlayabilirsiniz.
          </p>
        </div>

        {/* Substitute Requests */}
        {openSubstitutes && openSubstitutes.length > 0 && (
          <div className="bg-rose-50/50 rounded-xl border border-rose-200/80 p-6 shadow-sm relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
            <div>
              <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-600 animate-pulse" />
                🚨 Açık Vekil Öğretmen Talepleri
              </h3>
              <p className="text-xs text-rose-700/80 mt-1">
                Aşağıdaki dersler için vekil öğretmen aranmaktadır. Yardımcı olmak için kabul edebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {openSubstitutes.map((req) => (
                <div 
                  key={req.id} 
                  className="bg-white border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{req.class_name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {req.time_label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Tarih: <span className="font-semibold text-slate-700">{req.session_date}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Talebi Açan: <span className="font-medium text-slate-500">{req.requesting_teacher_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await respondMutation.mutateAsync({
                            request_id: req.id,
                            response: "accepted"
                          });
                          refetchSubstitutes();
                          refetchSlots();
                          refetchHours();
                        } catch (err) {
                          console.error("Failed to accept cover request", err);
                        }
                      }}
                      disabled={respondMutation.isPending}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {respondMutation.isPending ? "Kabul Ediliyor..." : "Kabul Et"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await respondMutation.mutateAsync({
                            request_id: req.id,
                            response: "declined"
                          });
                          refetchSubstitutes();
                        } catch (err) {
                          console.error("Failed to decline cover request", err);
                        }
                      }}
                      disabled={respondMutation.isPending}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-rose-100 border border-slate-200 hover:border-slate-300 transition-colors disabled:opacity-50"
                    >
                      {respondMutation.isPending ? "Reddediliyor..." : "Reddet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İstatistikler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kayıtlı Ders Seansları</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {loadingSlots ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  slots?.length || 0
                )}
              </span>
              <span className="text-xs text-slate-500">Haftalık ders</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onaylanan Saatler</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {loadingHours ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  totalApprovedHours
                )}
              </span>
              <span className="text-xs text-slate-500">Saat</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bekleyen Saat Raporları</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-500">
                {loadingHours ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  totalPendingHours
                )}
              </span>
              <span className="text-xs text-slate-500">Saat</span>
            </div>
          </div>

          <Link 
            href="/teacher/today" 
            className="bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all group"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Hızlı Yoklama</span>
              <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
            <span className="text-sm font-semibold text-primary mt-2">Bugünkü Dersleri Yönet</span>
          </Link>
        </div>

        {/* Ana İki Kolon */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sol Kolon: Aylık Ders Programım */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <CalendarDays className="h-5 w-5 text-primary" />
                {language === "tr" ? "Aylık Ders Programım" : "My Monthly Schedule"}
              </h3>
              
              {/* Month Navigation */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-all duration-150 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center min-w-[80px] justify-center">
                    {t(`month_${currentDate.getMonth()}` as any)}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-all duration-150 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleToday}
                  className="px-2 py-1 text-[9px] font-extrabold bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {language === "tr" ? "Bugün" : "Today"}
                </button>
              </div>
            </div>

            {loadingSlots || loadingTeachers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">{language === "tr" ? "Ders programı yükleniyor..." : "Loading schedule..."}</span>
              </div>
            ) : !slots || slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg">
                <Coffee className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-semibold text-slate-700">{language === "tr" ? "Kayıtlı Ders Yok" : "No Classes Scheduled"}</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  {language === "tr" ? "Programınızda tanımlanmış ders seansı bulunmamaktadır." : "There are no classes scheduled in your calendar."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 pb-1.5 text-center">
                  {weekdays.map((day) => (
                    <div key={day} className="text-[9px] font-extrabold text-slate-750 dark:text-slate-200 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {calendarCells.map((cell, idx) => {
                    const cellDayOfWeek = getDayOfWeekIndex(cell.date);
                    const isToday = cell.date.toDateString() === new Date().toDateString();
                    const cellLessons = actualOccurrences.filter((occ) => occ.dateStr === cell.date.toDateString());
                    const sortedLessons = [...cellLessons].sort((a, b) => a.start_time.localeCompare(b.start_time));

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (sortedLessons.length > 0) {
                            setSelectedDay({ date: cell.date, lessons: sortedLessons });
                          }
                        }}
                        className={`min-h-[70px] p-1 border-r border-b border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all relative ${
                          cell.isCurrentMonth
                            ? "bg-white dark:bg-slate-900"
                            : "bg-slate-50/20 dark:bg-slate-950/10 text-slate-400 dark:text-slate-600"
                        } ${isToday ? "ring-1 ring-primary ring-inset bg-blue-50/5" : ""} ${sortedLessons.length > 0 ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-primary text-white"
                              : cell.isCurrentMonth
                                ? "text-slate-955 dark:text-slate-50 font-extrabold"
                                : "text-slate-450 dark:text-slate-550"
                          }`}>
                            {cell.date.getDate()}
                          </span>
                        </div>

                        <div className="space-y-0.5 mt-1 pointer-events-none">
                          {sortedLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="text-[8px] font-bold px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex flex-col gap-0.25 text-left transition-colors w-full"
                              title={`${lesson.class_name} (${lesson.start_time} - ${lesson.end_time} @ ${lesson.room_name})`}
                            >
                              <div className="truncate font-extrabold w-full">{lesson.class_name}</div>
                              <div className="text-[7px] font-medium opacity-90">{lesson.start_time}-{lesson.end_time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>


          {/* Sağ Kolon: Saat Raporlama */}
          <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Saat Raporlama
              </h3>
              <button
                onClick={() => {
                  setEditingLogId(null);
                  setLogDate(new Date().toISOString().slice(0, 10));
                  setClassType("group");
                  setDurationMinutes(60);
                  setNotes("");
                  setIsModalOpen(true);
                }}
                className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors px-2 py-1 rounded bg-primary/5 hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Rapor Ekle
              </button>
            </div>

            {/* Tabbed Filters */}
            <div className="bg-slate-100/80 p-0.5 rounded-lg inline-flex gap-1 self-start">
              <button
                onClick={() => setActiveHourTab("all")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  activeHourTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveHourTab("pending")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  activeHourTab === "pending"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Bekleyen
              </button>
              <button
                onClick={() => setActiveHourTab("approved")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  activeHourTab === "approved"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Onaylanan
              </button>
            </div>

            {loadingHours ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Saat raporları yükleniyor...</span>
              </div>
            ) : !hourLogs || hourLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg">
                <Clock className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Rapor Bulunmamaktadır</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[250px]">
                  Girdiğiniz herhangi bir saat raporu bulunmuyor. Sağ üstteki butondan yeni saat girişi yapabilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Tarih</th>
                      <th className="py-2.5">Ders Tipi</th>
                      <th className="py-2.5">Süre</th>
                      <th className="py-2.5 text-right">Durum / İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hourLogs || [])
                      .filter((log) => {
                        if (activeHourTab === "pending") return log.status === "pending";
                        if (activeHourTab === "approved") return log.status === "approved";
                        return true;
                      })
                      .map((log) => (
                        <tr 
                          key={log.id} 
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-3 font-medium text-slate-900">
                            {log.log_date || "Belirtilmemiş"}
                          </td>
                          <td className="py-3 text-slate-500">
                            {classTypeLabels[log.class_type as keyof typeof classTypeLabels] || log.class_type}
                          </td>
                          <td className="py-3 font-semibold text-slate-700">
                            {log.hours} Saat
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusDetails[log.status as keyof typeof statusDetails]?.color || "text-slate-600 bg-slate-100 border-slate-200"}`}>
                                {statusDetails[log.status as keyof typeof statusDetails]?.label || log.status}
                              </span>

                              <button
                                onClick={() => setViewingAuditLog(log)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors"
                                title="Detayları Görüntüle"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {log.status === "pending" && (
                                <button
                                  onClick={() => {
                                    setEditingLogId(log.id);
                                    setLogDate(log.log_date || "");
                                    setClassType(log.class_type || "group");
                                    setDurationMinutes(log.hours * 60);
                                    setNotes(log.notes || "");
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors"
                                  title="Raporu Düzenle"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Rapor Detayı & Geçmişi Modalı */}
      {viewingAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Rapor Detayı & Geçmişi</h3>
              <button 
                onClick={() => setViewingAuditLog(null)}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Tarih</span>
                  <span className="text-slate-700 font-semibold">{viewingAuditLog.log_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Süre & Tip</span>
                  <span className="text-slate-700 font-semibold">
                    {viewingAuditLog.hours} Saat — {classTypeLabels[viewingAuditLog.class_type as keyof typeof classTypeLabels] || viewingAuditLog.class_type}
                  </span>
                </div>
                {viewingAuditLog.notes && (
                  <div>
                    <span className="text-slate-400 font-bold block">Notlar</span>
                    <span className="text-slate-700">{viewingAuditLog.notes}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">İşlem Geçmişi</h4>
                <div className="relative border-l border-slate-200 ml-2 pl-3 space-y-3">
                  {viewingAuditLog.audit_trail?.map((entry: any, index: number) => (
                    <div key={index} className="relative">
                      <span className="absolute -left-[17px] top-1 bg-white border-2 border-slate-300 w-2.5 h-2.5 rounded-full" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-700 capitalize">
                          {entry.action === "created" ? "Oluşturuldu" : entry.action === "updated" ? "Güncellendi" : entry.action === "approved" ? "Onaylandı" : "Reddedildi"}
                        </span>{" "}
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(entry.at).toLocaleString("tr-TR")}
                        </span>
                        {entry.note && (
                          <p className="text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 text-[10px]">
                            Not: {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setViewingAuditLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Günlük Dersler Modalı */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[85vh]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedDay.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">Bugüne ait ders programı detayları</p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-3 bg-slate-50">
              {selectedDay.lessons.map((lesson, index) => (
                <div key={lesson.id || index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <h4 className="font-bold text-slate-800 text-base">{lesson.class_name}</h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium">{lesson.start_time} - {lesson.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium">{lesson.room_name || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                      <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span className="text-sm font-medium">{activeTeacher?.full_name || 'Eğitmen'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedDay(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saat Raporu Giriş Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingLogId ? "Saat Raporunu Düzenle" : "Yeni Saat Raporu Bildir"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHourLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ders Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-slate-700 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ders Türü
                  </label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-slate-700 bg-white"
                  >
                    <option value="group">Grup Dersi</option>
                    <option value="private">Özel Ders</option>
                    <option value="online">Online Ders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Süre
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-slate-700 bg-white"
                  >
                    <option value={45}>45 Dakika (0.75 Saat)</option>
                    <option value={60}>60 Dakika (1.0 Saat)</option>
                    <option value={90}>90 Dakika (1.5 Saat)</option>
                    <option value={120}>120 Dakika (2.0 Saat)</option>
                    <option value={180}>180 Dakika (3.0 Saat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Açıklama / Notlar
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="İşlenen konu, telafi dersi veya özel notlar..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-slate-700 placeholder-slate-400 bg-white"
                />
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Saat raporunuz başarıyla gönderildi.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createHourLogMutation.isPending || submitSuccess}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {createHourLogMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

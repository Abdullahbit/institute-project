"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { supabase } from '@/lib/supabaseClient';
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
  CalendarDays
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

export default function TeacherDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const { data: openSubstitutes, refetch: refetchSubstitutes } = trpc.alerts.getOpenSubstituteRequests.useQuery();
  const respondMutation = trpc.alerts.respondToSubstituteRequest.useMutation();

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

  const handleSubmitHourLog = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    createHourLogMutation.mutate({
      log_date: logDate,
      class_type: classType,
      duration_minutes: Number(durationMinutes),
      notes: notes || undefined,
    });
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
          
          {/* Sol Kolon: Haftalık Programım */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Haftalık Programım
              </h3>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {slots?.length || 0} Ders
              </span>
            </div>

            {loadingSlots || loadingTeachers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Ders programı yükleniyor...</span>
              </div>
            ) : !slots || slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg">
                <Coffee className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Kayıtlı Ders Yok</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Haftalık programınızda tanımlanmış ders seansı bulunmamaktadır.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {slots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="flex flex-col gap-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[160px]">
                        {slot.class_name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {daysOfWeekMap[slot.day_of_week] || "Belirtilmemiş"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {slot.start_time} - {slot.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {slot.room_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sağ Kolon: Saat Raporlama */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Saat Raporlama
              </h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors px-2 py-1 rounded bg-primary/5 hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Rapor Ekle
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
                      <th className="py-2.5 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourLogs.map((log) => (
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
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusDetails[log.status as keyof typeof statusDetails]?.color || "text-slate-600 bg-slate-100 border-slate-200"}`}>
                            {statusDetails[log.status as keyof typeof statusDetails]?.label || log.status}
                          </span>
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

      {/* Saat Raporu Giriş Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Yeni Saat Raporu Bildir</h3>
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

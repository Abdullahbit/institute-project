"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import {
  ClipboardCheck,
  Users,
  UserX,
  Clock,
  Filter,
  Download,
  Loader2,
  Calendar,
  BookOpen,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          Var
        </span>
      );
    case "absent":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
          Yok
        </span>
      );
    case "late":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          Geç Kaldı
        </span>
      );
    default:
      return <span className="text-xs text-slate-400">{status}</span>;
  }
}

export default function YoklamaPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<number | undefined>(undefined);

  // Fetch classes for filter
  const { data: classes, isLoading: loadingClasses } = trpc.classes.list.useQuery();

  // Fetch attendance logs
  const { data: logs, isLoading: loadingLogs, refetch } = trpc.students.getAttendanceLogs.useQuery(
    {
      class_id: selectedClassId || undefined,
      session_date: selectedDate || undefined,
      round_number: selectedRound,
    },
    { enabled: true }
  );

  // Derived stats
  const totalPresent = logs?.filter((l) => l.status === "present").length ?? 0;
  const totalAbsent = logs?.filter((l) => l.status === "absent").length ?? 0;
  const totalLate = logs?.filter((l) => l.status === "late").length ?? 0;

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;

    const headers = ["Öğrenci", "Sınıf", "Ders Tarihi", "Tur", "Durum", "Not", "Kayıt Zamanı"];
    const rows = logs.map((log) => [
      log.student_name,
      log.class_name,
      log.session_date || "",
      `${log.round_number}. Tur`,
      log.status === "present" ? "Var" : log.status === "absent" ? "Yok" : "Geç Kaldı",
      log.notes || "",
      new Date(log.logged_at).toLocaleString("tr-TR"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `yoklama_raporu_${selectedDate || "tum"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminShell
      title="Yoklama Kayıtları"
      subtitle="Öğretmenlerin aldığı yoklamalar — sınıf, tarih ve tur bazında filtreleyin."
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Var</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{totalPresent}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <UserX className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Yok</p>
              <p className="text-2xl font-bold text-rose-600 mt-0.5">{totalAbsent}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geç Kalan</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{totalLate}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            {/* Class Filter */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Sınıf
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
              >
                <option value="">Tüm Sınıflar</option>
                {classes?.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Ders Tarihi
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Round Filter */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Tur
              </label>
              <select
                value={selectedRound ?? ""}
                onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
              >
                <option value="">Tüm Turlar</option>
                <option value="1">1. Tur</option>
                <option value="2">2. Tur</option>
                <option value="3">3. Tur</option>
                <option value="4">4. Tur</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => refetch()}
                disabled={loadingLogs}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                {loadingLogs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
                Filtrele
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!logs || logs.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                CSV İndir
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingLogs ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">Henüz yoklama kaydı yok</p>
                <p className="text-xs text-slate-400 mt-1">Filtre seçin veya öğretmenler yoklama aldığında burada görünecek.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Öğrenci</th>
                    <th className="px-6 py-4">Sınıf</th>
                    <th className="px-6 py-4">Ders Tarihi</th>
                    <th className="px-6 py-4 text-center">Tur</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{log.student_name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <BookOpen className="h-3 w-3 text-slate-400" />
                          {log.class_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{log.session_date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${
                          log.round_number === 1 ? "bg-blue-50 text-blue-600 border-blue-200" :
                          log.round_number === 2 ? "bg-violet-50 text-violet-600 border-violet-200" :
                          log.round_number === 3 ? "bg-orange-50 text-orange-600 border-orange-200" :
                          "bg-teal-50 text-teal-600 border-teal-200"
                        }`}>
                          {log.round_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic max-w-[200px] truncate">
                        {log.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{logs.length} kayıt listeleniyor</span>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="text-emerald-600">{totalPresent} Var</span>
                  <span className="text-rose-600">{totalAbsent} Yok</span>
                  <span className="text-amber-600">{totalLate} Geç</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

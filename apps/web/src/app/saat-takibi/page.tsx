"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { 
  CheckCheck, 
  Check, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Download, 
  User, 
  Calendar, 
  Eye, 
  X,
  FileSpreadsheet
} from "lucide-react";

const months = [
  { value: "01", label: "Ocak" },
  { value: "02", label: "Şubat" },
  { value: "03", label: "Mart" },
  { value: "04", label: "Nisan" },
  { value: "05", label: "Mayıs" },
  { value: "06", label: "Haziran" },
  { value: "07", label: "Temmuz" },
  { value: "08", label: "Ağustos" },
  { value: "09", label: "Eylül" },
  { value: "10", label: "Ekim" },
  { value: "11", label: "Kasım" },
  { value: "12", label: "Aralık" },
];

function getApprovalBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
          <Check className="h-3 w-3 mr-1" /> Onaylandı
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3 mr-1 animate-pulse" /> Beklemede
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 border border-rose-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Reddedildi
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          {status}
        </span>
      );
  }
}

export default function SaatTakibiPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState("06"); // June
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewingLog, setViewingLog] = useState<any | null>(null);

  const monthString = `${selectedYear}-${selectedMonth}`;

  // Queries
  const { data: teachers, isLoading: loadingTeachers } = trpc.teachers.list.useQuery();
  const { 
    data: summaryData, 
    isLoading: loadingSummary, 
    refetch: refetchSummary 
  } = trpc.hours.getHourLogSummary.useQuery(
    { teacher_id: selectedTeacherId, month: monthString },
    { enabled: !!selectedTeacherId }
  );

  // Mutations
  const reviewMutation = trpc.hours.reviewHourLog.useMutation();

  // Set default teacher on load
  useEffect(() => {
    if (teachers && teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (!summaryData?.logs) return;
    const pendingLogs = summaryData.logs.filter(l => l.status === "pending");
    setSelected(
      selected.length === pendingLogs.length ? [] : pendingLogs.map((r) => r.id)
    );
  };

  const handleReview = async (logId: string, decision: "approved" | "rejected") => {
    try {
      await reviewMutation.mutateAsync({
        log_id: logId,
        decision,
      });
      refetchSummary();
    } catch (err) {
      console.error("Failed to review log", err);
    }
  };

  const handleBulkApprove = async () => {
    try {
      await Promise.all(
        selected.map((logId) =>
          reviewMutation.mutateAsync({
            log_id: logId,
            decision: "approved",
          })
        )
      );
      setSelected([]);
      refetchSummary();
    } catch (err) {
      console.error("Bulk approve failed", err);
    }
  };

  const handleExportCSV = () => {
    if (!summaryData?.logs || summaryData.logs.length === 0) return;
    
    const selectedTeacherName = teachers?.find(t => t.id === selectedTeacherId)?.full_name || "Ogretmen";
    
    // Headers
    const headers = ["Ders Tarihi", "Ders Turu", "Sure (Saat)", "Durum", "Notlar", "Olusturulma Tarihi"];
    const rows = summaryData.logs.map((log) => [
      log.log_date || "",
      log.class_type === "group" ? "Grup Dersi" : log.class_type === "private" ? "Ozel Ders" : "Online Ders",
      log.hours.toString(),
      log.status === "approved" ? "Onaylandi" : log.status === "pending" ? "Beklemede" : "Reddedildi",
      log.notes || "",
      new Date(log.logged_at).toLocaleString("tr-TR")
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `saat_raporu_${selectedTeacherName.replace(/\s+/g, '_')}_${monthString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTeacherName = teachers?.find(t => t.id === selectedTeacherId)?.full_name || "";

  return (
    <AdminShell 
      title="Saat Takibi" 
      subtitle="Öğretmen ders saatlerini izleyin ve onaylayın."
    >
      {/* Filters & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Teacher Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <User className="h-4 w-4 text-slate-400" />
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setSelected([]);
              }}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:ring-0"
              disabled={loadingTeachers}
            >
              {loadingTeachers ? (
                <option>Yükleniyor...</option>
              ) : (
                teachers?.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))
              )}
            </select>
          </div>

          {/* Month & Year Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select 
              value={selectedMonth} 
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelected([]);
              }}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:ring-0"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <span className="text-slate-300 text-xs">|</span>
            <select 
              value={selectedYear} 
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelected([]);
              }}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:ring-0"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </div>

        {/* Action Triggers */}
        {summaryData && summaryData.logs.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm self-start md:self-auto"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Excel Dışa Aktar (CSV)
          </button>
        )}
      </div>

      {loadingSummary ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedTeacherId ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
          Lütfen veri görüntülemek için bir öğretmen seçin.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Onaylanan</span>
              <span className="text-2xl font-bold text-slate-900 mt-1">
                {summaryData?.summary.total_approved || 0} Saat
              </span>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bekleyen Onay</span>
              <span className="text-2xl font-bold text-amber-500 mt-1">
                {summaryData?.summary.total_pending || 0} Saat
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grup Dersleri (Onaylı)</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">
                {summaryData?.summary.breakdown.group || 0} Saat
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Özel & Online (Onaylı)</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">
                {((summaryData?.summary.breakdown.private || 0) + (summaryData?.summary.breakdown.online || 0))} Saat
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Header Controls */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                {activeTeacherName} — Saat Detay Raporu
              </h3>
              
              <button
                onClick={handleBulkApprove}
                disabled={selected.length === 0}
                className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-sm ${
                  selected.length > 0
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                }`}
              >
                <CheckCheck className="h-4 w-4" />
                Seçilenleri Onayla {selected.length > 0 && `(${selected.length})`}
              </button>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          (summaryData?.logs || []).filter(l => l.status === "pending").length > 0 &&
                          selected.length === (summaryData?.logs || []).filter(l => l.status === "pending").length
                        }
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-blue-600"
                        disabled={!(summaryData?.logs || []).some(l => l.status === "pending")}
                      />
                    </th>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Ders Türü</th>
                    <th className="px-6 py-4 text-center">Raporlanan Süre</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData?.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        Bu ay için bildirilmiş saat kaydı bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    summaryData?.logs.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 text-center">
                          {row.status === "pending" ? (
                            <input
                              type="checkbox"
                              checked={selected.includes(row.id)}
                              onChange={() => toggleSelect(row.id)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-blue-600"
                            />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 inline-block align-middle" />
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{row.log_date}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {row.class_type === "group" ? "Grup Dersi" : row.class_type === "private" ? "Özel Ders" : "Online Ders"}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 font-bold">{row.hours} Saat</td>
                        <td className="px-6 py-4">{getApprovalBadge(row.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Audit Trail */}
                            <button
                              onClick={() => setViewingLog(row)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Detay & Audit Trail Görüntüle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {row.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleReview(row.id, "approved")}
                                  disabled={reviewMutation.isPending}
                                  className="inline-flex items-center justify-center p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                                  title="Onayla"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleReview(row.id, "rejected")}
                                  disabled={reviewMutation.isPending}
                                  className="inline-flex items-center justify-center p-1.5 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors"
                                  title="Reddet"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Drawer Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Saat Raporu Geçmişi (Audit Trail)</h3>
              <button 
                onClick={() => setViewingLog(null)}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Tarih</span>
                  <span className="text-slate-700 font-semibold">{viewingLog.log_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Süre & Tip</span>
                  <span className="text-slate-700 font-semibold">{viewingLog.hours} Saat — {viewingLog.class_type}</span>
                </div>
                {viewingLog.notes && (
                  <div>
                    <span className="text-slate-400 font-bold block">Notlar</span>
                    <span className="text-slate-700">{viewingLog.notes}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Audit Trail Kayıtları</h4>
                <div className="relative border-l border-slate-200 ml-2.5 pl-4 space-y-4">
                  {viewingLog.audit_trail?.map((entry: any, index: number) => (
                    <div key={index} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 bg-white border-2 border-slate-300 w-3 h-3 rounded-full flex items-center justify-center" />
                      
                      <div className="text-xs">
                        <span className="font-bold text-slate-700 capitalize">{entry.action}</span>{" "}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(entry.at).toLocaleString("tr-TR")}
                        </span>
                        {entry.note && (
                          <p className="text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                            Açıklama: {entry.note}
                          </p>
                        )}
                        {entry.changes && (
                          <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                            <span className="font-semibold block text-slate-600">Değişiklikler:</span>
                            {Object.entries(entry.changes).map(([field, [oldVal, newVal]]: any) => (
                              <div key={field}>
                                <span className="font-mono text-slate-400">{field}:</span>{" "}
                                <span className="line-through text-red-500">{oldVal}</span> →{" "}
                                <span className="text-emerald-600 font-semibold">{newVal}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setViewingLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { CheckCheck, Check, Clock, AlertTriangle } from "lucide-react";

const initialTrackingData = [
  { id: 1, name: "Ayşe Kaya", planned: 88, actual: 86, diff: -2, approvalStatus: "Onaylandı" },
  { id: 2, name: "Mehmet Demir", planned: 72, actual: 70, diff: -2, approvalStatus: "Beklemede" },
  { id: 3, name: "Zeynep Çelik", planned: 48, actual: 48, diff: 0, approvalStatus: "Onaylandı" },
  { id: 4, name: "Ali Şahin", planned: 60, actual: 56, diff: -4, approvalStatus: "İtiraz" },
  { id: 5, name: "Fatma Yıldız", planned: 80, actual: 82, diff: +2, approvalStatus: "Beklemede" },
  { id: 6, name: "Can Arslan", planned: 32, actual: 30, diff: -2, approvalStatus: "Onaylandı" },
];

const months = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function getApprovalBadge(status: string) {
  switch (status) {
    case "Onaylandı":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
          <Check className="h-3 w-3 mr-1" /> Onaylandı
        </span>
      );
    case "Beklemede":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3 mr-1" /> Beklemede
        </span>
      );
    case "İtiraz":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 border border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> İtiraz
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
  const [selectedMonth, setSelectedMonth] = useState("Ocak");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selected, setSelected] = useState<number[]>([]);
  const [trackingData, setTrackingData] = useState(initialTrackingData);

  const toggleSelect = (id: number) => {
    setSelected((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected(selected.length === trackingData.length ? [] : trackingData.map((r) => r.id));
  };

  const handleBulkApprove = () => {
    setTrackingData((prev) =>
      prev.map((row) =>
        selected.includes(row.id) ? { ...row, approvalStatus: "Onaylandı" } : row
      )
    );
    setSelected([]);
  };

  return (
    <AdminShell 
      title="Saat Takibi" 
      subtitle="Öğretmen ders saatlerini izleyin ve onaylayın."
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
            {trackingData.filter(d => d.approvalStatus === "Beklemede").length} Bekleyen Onay
          </span>
        </div>
        
        {/* Month and Year select filters */}
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-primary transition-colors"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-primary transition-colors"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {selectedMonth} {selectedYear} — Saat Raporu
          </h3>
          
          <button
            onClick={handleBulkApprove}
            disabled={selected.length === 0}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
              selected.length > 0
                ? "bg-primary hover:bg-blue-600 text-white shadow-sm"
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
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selected.length === trackingData.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="px-6 py-4">Öğretmen</th>
                <th className="px-6 py-4 text-center">Planlanan Saat</th>
                <th className="px-6 py-4 text-center">Gerçekleşen Saat</th>
                <th className="px-6 py-4 text-center">Fark</th>
                <th className="px-6 py-4">Onay Durumu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trackingData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-center text-slate-600 font-medium">{row.planned} saat</td>
                  <td className="px-6 py-4 text-center text-slate-600 font-medium">{row.actual} saat</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${
                      row.diff === 0
                        ? "text-slate-400"
                        : row.diff > 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}>
                      {row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? "0" : row.diff} saat
                    </span>
                  </td>
                  <td className="px-6 py-4">{getApprovalBadge(row.approvalStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

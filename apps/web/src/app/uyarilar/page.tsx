"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { Clock, UserX, AlertCircle, CheckSquare, MessageSquare, Check, RotateCcw } from "lucide-react";

type TabType = "all" | "unread" | "devamsizlik" | "vekil";

function getAlertConfig(type: string) {
  switch (type) {
    case "late_check_in":
      return {
        icon: Clock,
        color: "text-orange-600",
        bg: "bg-orange-50 border-orange-100",
        label: "Geç Giriş"
      };
    case "no_show":
      return {
        icon: UserX,
        color: "text-red-600",
        bg: "bg-red-50 border-red-100",
        label: "Devamsızlık"
      };
    case "substitute_request":
      return {
        icon: AlertCircle,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-100",
        label: "Vekil Talebi"
      };
    case "hour_approval":
      return {
        icon: CheckSquare,
        color: "text-emerald-600",
        bg: "bg-emerald-50 border-emerald-100",
        label: "Saat Onayı"
      };
    default:
      return {
        icon: MessageSquare,
        color: "text-slate-600",
        bg: "bg-slate-50 border-slate-100",
        label: "Bildirim"
      };
  }
}

export default function UyarilarPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const { data, isLoading, error, refetch } = trpc.alerts.list.useQuery({ limit: 50 });
  const resolveMutation = trpc.alerts.resolveAlert.useMutation();

  const handleResolve = async (id: string) => {
    try {
      await resolveMutation.mutateAsync({ alert_id: id });
      refetch();
    } catch (err) {
      console.error("Resolve failed", err);
    }
  };

  const getFilteredAlerts = () => {
    if (!data) return [];
    switch (activeTab) {
      case "unread":
        return data.filter((a) => !a.is_resolved);
      case "devamsizlik":
        return data.filter((a) => a.type === "no_show");
      case "vekil":
        return data.filter((a) => a.type === "substitute_request");
      default:
        return data;
    }
  };

  const unreadCount = data ? data.filter((a) => !a.is_resolved).length : 0;
  const devamsizlikCount = data ? data.filter((a) => a.type === "no_show").length : 0;
  const vekilCount = data ? data.filter((a) => a.type === "substitute_request").length : 0;

  return (
    <AdminShell 
      title="Uyarılar" 
      subtitle="Sistem bildirimleri ve öğretmen uyarıları."
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {data && unreadCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 border border-blue-200">
            {unreadCount} okunmamış uyarı var
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-slate-500 font-medium">Yükleniyor…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold mb-6">
          API Hatası — Port 4000 çalışıyor mu?
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Custom Tabs List */}
          <div className="bg-slate-100/80 p-1 rounded-xl inline-flex gap-1 border border-slate-200/50">
            {[
              { id: "all", label: `Tümü (${data.length})` },
              { id: "unread", label: `Okunmamış (${unreadCount})` },
              { id: "devamsizlik", label: `Devamsızlık (${devamsizlikCount})` },
              { id: "vekil", label: `Vekil Talepleri (${vekilCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {getFilteredAlerts().length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
                Bu kategori için uyarı bulunmamaktadır.
              </div>
            ) : (
              getFilteredAlerts().map((alert) => {
                const config = getAlertConfig(alert.type);
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-5 rounded-xl border transition-all ${
                      alert.is_resolved 
                        ? "bg-white/60 border-slate-200/50 opacity-70" 
                        : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <div className={`mt-0.5 p-2.5 rounded-lg border ${config.bg} ${config.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{config.label}</span>
                          {!alert.is_resolved && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(alert.occurred_at).toLocaleDateString("tr-TR")}{" - "}{new Date(alert.occurred_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 font-medium">
                        <span className="font-bold text-slate-900">{alert.teacher_name || "Sistem"}</span>
                        {alert.teacher_name ? " — Öğretmen" : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{alert.description}</p>
                    </div>
                    
                    {!alert.is_resolved && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-primary text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
                      >
                        <Check className="h-3.5 w-3.5" />
                        İşlem Yap
                      </button>
                    )}
                    {alert.is_resolved && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        Çözüldü
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, UserX, ArrowLeftRight, ClipboardCheck, Check } from "lucide-react";

type AlertType = "Geç Giriş" | "Devamsızlık" | "Vekil Talebi" | "Onay Bekliyor";

interface Alert {
  id: number;
  type: AlertType;
  teacher: string;
  className: string;
  timestamp: string;
  description: string;
  read: boolean;
}

const allAlerts: Alert[] = [
  { id: 1, type: "Geç Giriş", teacher: "Ali Şahin", className: "A1 Başlangıç", timestamp: "Bugün, 09:15", description: "Planlanandan 15 dakika geç giriş yaptı.", read: false },
  { id: 2, type: "Devamsızlık", teacher: "Zeynep Çelik", className: "A2 Temel", timestamp: "Bugün, 08:45", description: "Derse girmedi. Öğrenciler bekliyor.", read: false },
  { id: 3, type: "Vekil Talebi", teacher: "Fatma Yıldız", className: "B1 Orta", timestamp: "Bugün, 10:30", description: "Yarınki ders için vekil öğretmen talep edildi.", read: false },
  { id: 4, type: "Onay Bekliyor", teacher: "Mehmet Demir", className: "B2 Üst-Orta", timestamp: "Dün, 17:00", description: "Ocak ayı saat raporu onay bekliyor.", read: true },
  { id: 5, type: "Geç Giriş", teacher: "Ayşe Kaya", className: "C1 İleri", timestamp: "Dün, 11:08", description: "Planlanandan 8 dakika geç giriş yaptı.", read: true },
  { id: 6, type: "Vekil Talebi", teacher: "Can Arslan", className: "A1 Başlangıç", timestamp: "2 gün önce, 14:00", description: "Hastalık sebebiyle vekil talep edildi.", read: true },
  { id: 7, type: "Devamsızlık", teacher: "Ali Şahin", className: "B1 Orta", timestamp: "3 gün önce, 09:00", description: "Derse girmedi. Bildirim gönderilmedi.", read: true },
  { id: 8, type: "Onay Bekliyor", teacher: "Fatma Yıldız", className: "B2 Üst-Orta", timestamp: "3 gün önce, 16:00", description: "Aralık ayı saat raporu onay bekliyor.", read: true },
];

const alertConfig: Record<AlertType, { icon: React.ComponentType<{ className?: string }>, color: string, bg: string, label: string }> = {
  "Geç Giriş": { icon: Clock, color: "text-orange-600", bg: "bg-orange-50 border-orange-100", label: "Geç Giriş" },
  "Devamsızlık": { icon: UserX, color: "text-red-600", bg: "bg-red-50 border-red-100", label: "Devamsızlık" },
  "Vekil Talebi": { icon: ArrowLeftRight, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", label: "Vekil Talebi" },
  "Onay Bekliyor": { icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-50 border-amber-100", label: "Onay Bekliyor" },
};

function AlertCard({ alert }: { alert: Alert }) {
  const config = alertConfig[alert.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${alert.read ? "bg-white border-slate-100" : "bg-slate-50/80 border-slate-200"}`}
      data-testid={`alert-card-${alert.id}`}
    >
      <div className={`mt-0.5 p-2.5 rounded-lg border ${config.bg} ${config.color} shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{alert.type}</span>
            {!alert.read && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
            )}
          </div>
          <span className="text-xs text-slate-400 shrink-0">{alert.timestamp}</span>
        </div>
        <p className="text-sm text-slate-700 mt-1">
          <span className="font-medium text-slate-900">{alert.teacher}</span>
          {" — "}
          <span className="text-slate-500">{alert.className}</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs shrink-0"
        data-testid={`button-alert-action-${alert.id}`}
      >
        <Check className="h-3 w-3 mr-1" />
        İşlem Yap
      </Button>
    </div>
  );
}

export default function Uyarilar() {
  const unread = allAlerts.filter((a) => !a.read);
  const devamsizlik = allAlerts.filter((a) => a.type === "Devamsızlık");
  const vekilTalepleri = allAlerts.filter((a) => a.type === "Vekil Talebi");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Uyarılar</h1>
          {unread.length > 0 && (
            <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">
              {unread.length} okunmamış
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">Sistem bildirimleri ve öğretmen uyarıları.</p>
      </div>

      <Tabs defaultValue="all" data-testid="tabs-alerts">
        <TabsList className="bg-slate-100 h-9">
          <TabsTrigger value="all" className="text-xs" data-testid="tab-all">Tümü ({allAlerts.length})</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs" data-testid="tab-unread">Okunmamış ({unread.length})</TabsTrigger>
          <TabsTrigger value="devamsizlik" className="text-xs" data-testid="tab-devamsizlik">Devamsızlık ({devamsizlik.length})</TabsTrigger>
          <TabsTrigger value="vekil" className="text-xs" data-testid="tab-vekil">Vekil Talepleri ({vekilTalepleri.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {allAlerts.map((a) => <AlertCard key={a.id} alert={a} />)}
        </TabsContent>
        <TabsContent value="unread" className="mt-4 space-y-3">
          {unread.length === 0
            ? <p className="text-sm text-slate-500 py-8 text-center">Okunmamış uyarı yok.</p>
            : unread.map((a) => <AlertCard key={a.id} alert={a} />)}
        </TabsContent>
        <TabsContent value="devamsizlik" className="mt-4 space-y-3">
          {devamsizlik.map((a) => <AlertCard key={a.id} alert={a} />)}
        </TabsContent>
        <TabsContent value="vekil" className="mt-4 space-y-3">
          {vekilTalepleri.map((a) => <AlertCard key={a.id} alert={a} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

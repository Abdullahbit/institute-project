import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Users, GraduationCap, CheckCircle2, AlertCircle, Clock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

const todaySchedule = [
  { id: 1, time: "09:00 - 09:50", class: "A1 Başlangıç", teacher: "Ayşe Kaya", students: 12, status: "Devam Ediyor" },
  { id: 2, time: "10:00 - 10:50", class: "B1 Orta", teacher: "Mehmet Demir", students: 14, status: "Tamamlandı" },
  { id: 3, time: "11:00 - 11:50", class: "C1 İleri", teacher: "Fatma Yıldız", students: 8, status: "Vekil Bekleniyor" },
  { id: 4, time: "13:00 - 13:50", class: "A2 Temel", teacher: "Zeynep Çelik", students: 15, status: "İptal" },
  { id: 5, time: "14:00 - 14:50", class: "B2 Üst-Orta", teacher: "Ali Şahin", students: 10, status: "Bekliyor" },
];

const alerts = [
  { id: 1, type: "Geç Giriş", teacher: "Ali Şahin", time: "09:15", desc: "İlk derse geç giriş yaptı", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: 2, type: "Vekil Talebi", teacher: "Fatma Yıldız", time: "10:30", desc: "Yarınki B1 sınıfı için vekil talebi", icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 3, type: "Devamsızlık", teacher: "Zeynep Çelik", time: "08:45", desc: "A2 Temel sınıfı öğretmensiz", icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Devam Ediyor":
      return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">Devam Ediyor</Badge>;
    case "Tamamlandı":
      return <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Tamamlandı</Badge>;
    case "İptal":
      return <Badge variant="destructive" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200">İptal</Badge>;
    case "Vekil Bekleniyor":
      return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200">Vekil Bekleniyor</Badge>;
    default:
      return <Badge variant="outline" className="text-slate-500">Bekliyor</Badge>;
  }
}

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ana Sayfa</h1>
        <p className="text-sm text-slate-500 mt-1">Bright Minds Dil Okulu günlük özet tablosu.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Bugünkü Dersler</p>
                <h3 className="text-2xl font-bold text-slate-900">12</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Aktif Öğretmenler</p>
                <h3 className="text-2xl font-bold text-slate-900">8</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Toplam Öğrenci</p>
                <h3 className="text-2xl font-bold text-slate-900">147</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Bekleyen Onaylar</p>
                <h3 className="text-2xl font-bold text-slate-900">3</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200/60">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-slate-900">Bugünkü Program</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs">Tümünü Gör</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[120px] font-medium">Saat</TableHead>
                  <TableHead className="font-medium">Sınıf</TableHead>
                  <TableHead className="font-medium">Öğretmen</TableHead>
                  <TableHead className="text-center font-medium">Öğrenci</TableHead>
                  <TableHead className="text-right font-medium">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaySchedule.map((lesson) => (
                  <TableRow key={lesson.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-600">{lesson.time}</TableCell>
                    <TableCell>{lesson.class}</TableCell>
                    <TableCell>{lesson.teacher}</TableCell>
                    <TableCell className="text-center text-slate-600">{lesson.students}</TableCell>
                    <TableCell className="text-right">{getStatusBadge(lesson.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-medium text-slate-900">Son Uyarılar</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50 transition-colors hover:bg-slate-50">
                  <div className={`mt-0.5 p-2 rounded-md ${alert.bg} ${alert.color}`}>
                    <alert.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{alert.type}</p>
                      <span className="text-xs text-slate-500">{alert.time}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">{alert.teacher}</span>: {alert.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Tüm Uyarıları Görüntüle
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

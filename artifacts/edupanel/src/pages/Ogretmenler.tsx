import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Eye, Pencil } from "lucide-react";

const teachers = [
  { id: 1, name: "Ayşe Kaya", branch: "İngilizce", activeClasses: 22, monthlyHours: 86, status: "Aktif" },
  { id: 2, name: "Mehmet Demir", branch: "Almanca", activeClasses: 18, monthlyHours: 72, status: "Aktif" },
  { id: 3, name: "Zeynep Çelik", branch: "İngilizce", activeClasses: 0, monthlyHours: 48, status: "İzinli" },
  { id: 4, name: "Ali Şahin", branch: "Fransızca", activeClasses: 14, monthlyHours: 56, status: "Aktif" },
  { id: 5, name: "Fatma Yıldız", branch: "İspanyolca", activeClasses: 20, monthlyHours: 80, status: "Aktif" },
  { id: 6, name: "Can Arslan", branch: "İngilizce", activeClasses: 0, monthlyHours: 30, status: "Pasif" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Aktif":
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/25">Aktif</Badge>;
    case "İzinli":
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/25">İzinli</Badge>;
    case "Pasif":
      return <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200">Pasif</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Ogretmenler() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Öğretmenler</h1>
          <p className="text-sm text-slate-500 mt-1">Tüm öğretmenleri görüntüle ve yönet.</p>
        </div>
        <Button className="flex items-center gap-2" data-testid="button-yeni-ogretmen">
          <UserPlus className="h-4 w-4" />
          Yeni Öğretmen Ekle
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-medium text-slate-900">
            Öğretmen Listesi
            <span className="ml-2 text-sm font-normal text-slate-500">({teachers.length} öğretmen)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-medium">Ad Soyad</TableHead>
                <TableHead className="font-medium">Branş</TableHead>
                <TableHead className="text-center font-medium">Aktif Dersler</TableHead>
                <TableHead className="text-center font-medium">Aylık Saat</TableHead>
                <TableHead className="font-medium">Durum</TableHead>
                <TableHead className="text-right font-medium">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow
                  key={teacher.id}
                  className="hover:bg-slate-50/50 transition-colors"
                  onMouseEnter={() => setHoveredRow(teacher.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  data-testid={`row-teacher-${teacher.id}`}
                >
                  <TableCell className="font-medium text-slate-900">{teacher.name}</TableCell>
                  <TableCell className="text-slate-600">{teacher.branch}</TableCell>
                  <TableCell className="text-center text-slate-700">{teacher.activeClasses}</TableCell>
                  <TableCell className="text-center text-slate-700">{teacher.monthlyHours} saat</TableCell>
                  <TableCell>{getStatusBadge(teacher.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        data-testid={`button-view-teacher-${teacher.id}`}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Görüntüle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        data-testid={`button-edit-teacher-${teacher.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Düzenle
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

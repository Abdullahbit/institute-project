import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCheck } from "lucide-react";

const trackingData = [
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
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/25">Onaylandı</Badge>;
    case "Beklemede":
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/25">Beklemede</Badge>;
    case "İtiraz":
      return <Badge className="bg-red-500/15 text-red-700 border-red-200 hover:bg-red-500/25">İtiraz</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function SaatTakibi() {
  const [selectedMonth, setSelectedMonth] = useState("Ocak");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selected, setSelected] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === trackingData.length ? [] : trackingData.map((r) => r.id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Saat Takibi</h1>
          <p className="text-sm text-slate-500 mt-1">Öğretmen ders saatlerini izle ve onayla.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36 h-9" data-testid="select-month">
              <SelectValue placeholder="Ay seçin" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-9" data-testid="select-year">
              <SelectValue placeholder="Yıl" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-900">
              {selectedMonth} {selectedYear} — Saat Raporu
            </CardTitle>
            <Button
              size="sm"
              disabled={selected.length === 0}
              className="flex items-center gap-2 h-8 text-xs"
              data-testid="button-bulk-approve"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Seçilenleri Onayla {selected.length > 0 && `(${selected.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.length === trackingData.length}
                    onCheckedChange={toggleAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="font-medium">Öğretmen</TableHead>
                <TableHead className="text-center font-medium">Planlanan Saat</TableHead>
                <TableHead className="text-center font-medium">Gerçekleşen Saat</TableHead>
                <TableHead className="text-center font-medium">Fark</TableHead>
                <TableHead className="font-medium">Onay Durumu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackingData.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-tracking-${row.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() => toggleSelect(row.id)}
                      data-testid={`checkbox-teacher-${row.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                  <TableCell className="text-center text-slate-700">{row.planned} saat</TableCell>
                  <TableCell className="text-center text-slate-700">{row.actual} saat</TableCell>
                  <TableCell className="text-center">
                    <span className={
                      row.diff === 0
                        ? "text-slate-500"
                        : row.diff > 0
                        ? "text-emerald-600 font-medium"
                        : "text-red-600 font-medium"
                    }>
                      {row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? "0" : row.diff} saat
                    </span>
                  </TableCell>
                  <TableCell>{getApprovalBadge(row.approvalStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

// Mock schedule data (dayIndex, hourIndex)
const scheduleData = [
  { day: 0, hour: 0, class: "A1 Başlangıç", teacher: "Ayşe Kaya", room: "Sınıf 1", color: "bg-blue-50 border-blue-200" },
  { day: 0, hour: 1, class: "B1 Orta", teacher: "Mehmet Demir", room: "Sınıf 2", color: "bg-indigo-50 border-indigo-200" },
  { day: 1, hour: 2, class: "C1 İleri", teacher: "Fatma Yıldız", room: "Laboratuvar", color: "bg-purple-50 border-purple-200" },
  { day: 2, hour: 4, class: "A2 Temel", teacher: "Zeynep Çelik", room: "Sınıf 3", color: "bg-emerald-50 border-emerald-200" },
  { day: 3, hour: 5, class: "B2 Üst-Orta", teacher: "Ali Şahin", room: "Sınıf 1", color: "bg-amber-50 border-amber-200" },
  { day: 4, hour: 8, class: "A1 Başlangıç", teacher: "Ayşe Kaya", room: "Sınıf 2", color: "bg-blue-50 border-blue-200" },
  { day: 5, hour: 1, class: "B1 Orta", teacher: "Mehmet Demir", room: "Laboratuvar", color: "bg-indigo-50 border-indigo-200" },
];

export default function Program() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Haftalık Program</h1>
          <p className="text-sm text-slate-500 mt-1">Tüm sınıfların ve öğretmenlerin haftalık ders programı.</p>
        </div>
        <Button className="shrink-0" data-testid="button-add-lesson">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Ders Ekle
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200/60 shrink-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center text-sm font-medium text-slate-500 mr-2">
              <Filter className="h-4 w-4 mr-2" />
              Filtreler
            </div>
            <div className="w-[180px]">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Öğretmen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="ayse">Ayşe Kaya</SelectItem>
                  <SelectItem value="mehmet">Mehmet Demir</SelectItem>
                  <SelectItem value="zeynep">Zeynep Çelik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sınıf Seviyesi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="a1">A1 Başlangıç</SelectItem>
                  <SelectItem value="a2">A2 Temel</SelectItem>
                  <SelectItem value="b1">B1 Orta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Oda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="sinif1">Sınıf 1</SelectItem>
                  <SelectItem value="sinif2">Sınıf 2</SelectItem>
                  <SelectItem value="lab">Laboratuvar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 shadow-sm border-slate-200/60 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 p-0 m-0 custom-scrollbar">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
              <div className="p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 bg-slate-50/80">
                Saat
              </div>
              {days.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-slate-700 border-r border-slate-200 bg-slate-50/80 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="flex flex-col relative">
              {hours.map((hour, hIdx) => (
                <div key={hour} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 min-h-[100px]">
                  <div className="p-3 text-center text-xs font-medium text-slate-500 border-r border-slate-200 bg-slate-50/30 flex items-center justify-center">
                    {hour}
                  </div>
                  {days.map((_, dIdx) => {
                    const lesson = scheduleData.find(l => l.day === dIdx && l.hour === hIdx);
                    return (
                      <div key={`${dIdx}-${hIdx}`} className="p-1.5 border-r border-slate-100 last:border-r-0 relative group">
                        {lesson && (
                          <div className={`h-full rounded-md border p-2 flex flex-col justify-between transition-shadow hover:shadow-md cursor-pointer ${lesson.color}`}>
                            <div>
                              <div className="font-semibold text-sm text-slate-900 leading-tight">{lesson.class}</div>
                              <div className="text-xs text-slate-600 mt-1 font-medium">{lesson.teacher}</div>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              {lesson.room}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

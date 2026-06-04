"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { Calendar, User, MapPin, Clock, Plus, X, Check } from "lucide-react";

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const cardThemes = [
  { bg: "bg-blue-50/40 border-blue-200/60", border: "border-blue-500", text: "text-blue-700", bullet: "bg-blue-400" },
  { bg: "bg-indigo-50/40 border-indigo-200/60", border: "border-indigo-500", text: "text-indigo-700", bullet: "bg-indigo-400" },
  { bg: "bg-purple-50/40 border-purple-200/60", border: "border-purple-500", text: "text-purple-700", bullet: "bg-purple-400" },
  { bg: "bg-emerald-50/40 border-emerald-200/60", border: "border-emerald-500", text: "text-emerald-700", bullet: "bg-emerald-400" },
  { bg: "bg-amber-50/40 border-amber-200/60", border: "border-amber-500", text: "text-amber-700", bullet: "bg-amber-400" },
];

export default function ProgramPage() {
  const { data: apiData, isLoading, error } = trpc.schedule.list.useQuery();
  const [lessons, setLessons] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form states
  const [className, setClassName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [roomName, setRoomName] = useState("Sınıf 1");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");

  // Load and merge initial and custom lessons
  useEffect(() => {
    if (apiData) {
      const storedCustom = localStorage.getItem("customLessons");
      let customList = [];
      if (storedCustom) {
        try {
          customList = JSON.parse(storedCustom);
        } catch (e) {
          console.error(e);
        }
      }
      setLessons([...apiData, ...customList]);
    }
  }, [apiData]);

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !teacherName) return;

    const newLesson = {
      id: "custom-" + Date.now(),
      class_name: className,
      teacher_name: teacherName,
      room_name: roomName,
      day_of_week: Number(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
    };

    const updated = [...lessons, newLesson];
    setLessons(updated);

    // Save custom lessons to localStorage
    const storedCustom = localStorage.getItem("customLessons");
    let customList = [];
    if (storedCustom) {
      try {
        customList = JSON.parse(storedCustom);
      } catch (e) {
        console.error(e);
      }
    }
    customList.push(newLesson);
    localStorage.setItem("customLessons", JSON.stringify(customList));

    // Reset Form & Close Modal
    setClassName("");
    setTeacherName("");
    setRoomName("Sınıf 1");
    setDayOfWeek(0);
    setStartTime("09:00");
    setEndTime("09:50");
    setModalOpen(false);

    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <AdminShell 
      title="Haftalık Program" 
      subtitle="Bright Minds Dil Okulu haftalık ders ve sınıf dağılımı."
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          {successMsg && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="h-3.5 w-3.5" /> Yeni ders başarıyla eklendi.
            </span>
          )}
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Ders Ekle
        </button>
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

      {lessons && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
              Henüz programlanmış ders bulunmamaktadır.
            </div>
          ) : (
            lessons.map((slot, index) => {
              const theme = cardThemes[index % cardThemes.length];
              return (
                <div
                  key={slot.id}
                  className={`bg-white border-l-4 ${theme.border} border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {days[slot.day_of_week] || "Belirsiz Gün"}
                      </span>
                      <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-900 leading-snug mt-2">
                      {slot.class_name}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-3 font-medium">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      {slot.teacher_name}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {slot.room_name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.bullet}`}></span>
                      Aktif Seans
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Yeni Ders Ekle</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddLesson} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sınıf Seviyesi / Adı</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="örn: B1 Orta"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Öğretmen Adı</label>
                <input 
                  type="text" 
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="örn: Ahmet Yılmaz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Derslik / Sınıf</label>
                  <select
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  >
                    <option value="Sınıf 1">Sınıf 1</option>
                    <option value="Sınıf 2">Sınıf 2</option>
                    <option value="Sınıf 3">Sınıf 3</option>
                    <option value="Laboratuvar">Laboratuvar</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gün</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  >
                    {days.map((day, idx) => (
                      <option key={day} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Başlangıç Saati</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bitiş Saati</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

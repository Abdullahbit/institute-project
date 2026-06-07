"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { Calendar, User, MapPin, Clock, Plus, X, Check, Filter, RotateCcw, Loader2, Trash2 } from "lucide-react";

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function getLessonTheme(className: string) {
  const name = className.toLowerCase();
  if (name.includes("a1")) {
    return {
      bg: "bg-blue-50/80 hover:bg-blue-100/90 border-blue-200",
      border: "border-blue-500",
      text: "text-blue-900",
      sub: "text-blue-600",
      dot: "bg-blue-500"
    };
  } else if (name.includes("b1")) {
    return {
      bg: "bg-indigo-50/80 hover:bg-indigo-100/90 border-indigo-200",
      border: "border-indigo-500",
      text: "text-indigo-900",
      sub: "text-indigo-600",
      dot: "bg-indigo-500"
    };
  } else if (name.includes("c1") || name.includes("c2") || name.includes("ileri")) {
    return {
      bg: "bg-purple-50/80 hover:bg-purple-100/90 border-purple-200",
      border: "border-purple-500",
      text: "text-purple-900",
      sub: "text-purple-600",
      dot: "bg-purple-500"
    };
  } else if (name.includes("a2") || name.includes("temel")) {
    return {
      bg: "bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200",
      border: "border-emerald-500",
      text: "text-emerald-900",
      sub: "text-emerald-600",
      dot: "bg-emerald-500"
    };
  } else if (name.includes("b2") || name.includes("orta")) {
    return {
      bg: "bg-amber-50/80 hover:bg-amber-100/90 border-amber-200",
      border: "border-amber-500",
      text: "text-amber-900",
      sub: "text-amber-600",
      dot: "bg-amber-500"
    };
  } else {
    return {
      bg: "bg-slate-50/80 hover:bg-slate-100/90 border-slate-200",
      border: "border-slate-500",
      text: "text-slate-900",
      sub: "text-slate-600",
      dot: "bg-slate-500"
    };
  }
}

export default function ProgramPage() {
  const { data: apiData, isLoading, error, refetch } = trpc.classes.listSlots.useQuery();
  const { data: teachersList } = trpc.teachers.list.useQuery();
  const { data: classesList } = trpc.classes.list.useQuery();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for adding/editing lessons
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomName, setRoomName] = useState("Sınıf 1");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");

  // Filters state
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  // Mutations
  const createSlotMutation = trpc.classes.createSlot.useMutation();
  const updateSlotMutation = trpc.classes.updateSlot.useMutation();
  const deleteSlotMutation = trpc.classes.deleteSlot.useMutation();

  // Extract unique options for filter dropdowns from backend data
  const uniqueTeachers = Array.from(new Set((apiData || []).map((l) => l.teacher_name))).filter(Boolean);
  const uniqueClasses = Array.from(new Set((apiData || []).map((l) => l.class_name))).filter(Boolean);
  const uniqueRooms = Array.from(new Set((apiData || []).map((l) => l.room_name))).filter(Boolean);

  // Filter lessons
  const filteredLessons = (apiData || []).filter((lesson) => {
    if (selectedTeacher && lesson.teacher_name !== selectedTeacher) return false;
    if (selectedClass && lesson.class_name !== selectedClass) return false;
    if (selectedRoom && lesson.room_name !== selectedRoom) return false;
    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingSlotId(null);
    setClassId("");
    setTeacherId("");
    setRoomName("Sınıf 1");
    setDayOfWeek(0);
    setStartTime("09:00");
    setEndTime("09:50");
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (lesson: any) => {
    setEditingSlotId(lesson.id);
    setClassId(lesson.class_id);
    setTeacherId(lesson.teacher_id);
    setRoomName(lesson.room_name);
    setDayOfWeek(Number(lesson.day_of_week));
    setStartTime(lesson.start_time);
    setEndTime(lesson.end_time);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !teacherId) return;

    setErrorMsg(null);

    try {
      if (editingSlotId) {
        await updateSlotMutation.mutateAsync({
          id: editingSlotId,
          data: {
            class_id: classId,
            teacher_id: teacherId,
            room_name: roomName,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
          },
        });
        setSuccessMsg("Ders programı başarıyla güncellendi.");
      } else {
        await createSlotMutation.mutateAsync({
          class_id: classId,
          teacher_id: teacherId,
          room_name: roomName,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          status: "scheduled",
        });
        setSuccessMsg("Yeni ders başarıyla eklendi.");
      }
      
      refetch();
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "İşlem başarısız oldu.");
    }
  };

  const handleDeleteLessonFromModal = async () => {
    if (!editingSlotId) return;
    if (!confirm("Bu dersi programdan silmek istediğinize emin misiniz?")) return;

    setErrorMsg(null);

    try {
      await deleteSlotMutation.mutateAsync({ id: editingSlotId });
      setSuccessMsg("Ders programdan silindi.");
      refetch();
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Silme işlemi başarısız oldu.");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Bu dersi programdan silmek istediğinize emin misiniz?")) return;

    setErrorMsg(null);

    try {
      await deleteSlotMutation.mutateAsync({ id: lessonId });
      setSuccessMsg("Ders programdan silindi.");
      refetch();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Silme işlemi başarısız oldu.");
    }
  };

  const clearFilters = () => {
    setSelectedTeacher("");
    setSelectedClass("");
    setSelectedRoom("");
  };

  const hasActiveFilters = selectedTeacher || selectedClass || selectedRoom;

  return (
    <AdminShell 
      title="Haftalık Program" 
      subtitle="Tüm sınıfların ve öğretmenlerin haftalık ders programını yönetin."
    >
      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {successMsg && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="h-3.5 w-3.5" /> {successMsg}
            </span>
          )}
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Yeni Ders Ekle
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold mr-2 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-slate-400" />
            Filtreler
          </div>

          {/* Teacher Filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Öğretmen</option>
            {uniqueTeachers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Sınıf Seviyesi</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Room Filter */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Oda</option>
            {uniqueRooms.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Filtreleri Temizle
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Loader2 className="h-6 w-6 text-primary animate-spin mr-2" />
          <p className="text-slate-500 font-medium">Ders programı yükleniyor…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold mb-6">
          API Hatası — Sunucu bağlantısı kurulamadı.
        </div>
      )}

      {/* Timetable Table Grid */}
      {!isLoading && !error && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[800px]">
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24 border-r border-slate-200">
                    SAAT
                  </th>
                  {days.map((day) => (
                    <th 
                      key={day} 
                      className="py-3 px-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {hours.map((hour) => {
                  const hourPrefix = hour.slice(0, 2);

                  return (
                    <tr 
                      key={hour} 
                      className="border-b border-slate-200/80 last:border-b-0 hover:bg-slate-50/10 transition-colors"
                    >
                      {/* Hour labels */}
                      <td className="py-4 px-3 text-center border-r border-slate-200 font-bold text-[13px] text-slate-500 bg-slate-50/40">
                        {hour}
                      </td>

                      {/* Day cells */}
                      {days.map((day, dayIdx) => {
                        // Find lessons for this day and hour slot
                        const cellLessons = filteredLessons.filter((l) => {
                          const lHourPrefix = l.start_time ? l.start_time.slice(0, 2) : "";
                          return l.day_of_week === dayIdx && lHourPrefix === hourPrefix;
                        });

                        return (
                          <td 
                            key={day} 
                            className="p-2 border-r border-slate-200 last:border-r-0 min-h-[110px] align-top"
                          >
                            <div className="flex flex-col gap-2 h-full justify-start">
                              {cellLessons.map((lesson) => {
                                const theme = getLessonTheme(lesson.class_name);
                                return (
                                  <div
                                    key={lesson.id}
                                    onClick={() => handleOpenEditModal(lesson)}
                                    className={`${theme.bg} border-l-4 ${theme.border} border border-slate-200/60 rounded-xl p-3 shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer`}
                                    title="Dersi Düzenle / Sil"
                                  >
                                    {/* Delete Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLesson(lesson.id);
                                      }}
                                      className="absolute top-2 right-2 p-1 rounded-md bg-white/90 hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-200/50 shadow-sm transition-all duration-200 hover:scale-105 cursor-pointer"
                                      title="Dersi Sil"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>

                                    <div className="font-bold text-slate-900 text-[13px] leading-snug pr-5">
                                      {lesson.class_name}
                                    </div>
                                    <div className="text-slate-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                                      {lesson.teacher_name}
                                    </div>
                                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        {lesson.room_name}
                                      </span>
                                      <div className="text-right">
                                        <span className="flex items-center gap-1 text-[9px] justify-end">
                                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
                                          {lesson.start_time} - {lesson.end_time}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingSlotId ? "Dersi Düzenle" : "Yeni Ders Ekle"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveLesson} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sınıf Seçin</label>
                <select 
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">Sınıf Seçin</option>
                  {classesList?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.levelCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Öğretmen Seçin</label>
                <select 
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">Öğretmen Seçin</option>
                  {teachersList?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.branch})
                    </option>
                  ))}
                </select>
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Derslik / Sınıf</label>
                  <select
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
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

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  {editingSlotId && (
                    <button
                      type="button"
                      onClick={handleDeleteLessonFromModal}
                      disabled={deleteSlotMutation.isPending}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Dersi Sil
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {(createSlotMutation.isPending || updateSlotMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

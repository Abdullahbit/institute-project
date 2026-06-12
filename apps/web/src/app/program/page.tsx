"use client";

import React, { useState, useMemo } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Calendar as CalendarIcon, 
  User, 
  MapPin, 
  Clock, 
  Plus, 
  X, 
  Check, 
  Filter, 
  RotateCcw, 
  Loader2, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

function getLessonTheme(className: string) {
  const name = className.toLowerCase();
  if (name.includes("a1")) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/90 dark:hover:bg-blue-950/50 border-blue-300 dark:border-blue-800",
      border: "border-blue-600",
      text: "text-blue-950 dark:text-blue-50 font-bold",
      sub: "text-blue-700 dark:text-blue-300",
      dot: "bg-blue-600"
    };
  } else if (name.includes("b1")) {
    return {
      bg: "bg-indigo-50 dark:bg-indigo-955/30 hover:bg-indigo-100/90 dark:hover:bg-indigo-955/50 border-indigo-300 dark:border-indigo-800",
      border: "border-indigo-600",
      text: "text-indigo-955 dark:text-indigo-50 font-bold",
      sub: "text-indigo-700 dark:text-indigo-300",
      dot: "bg-indigo-600"
    };
  } else if (name.includes("c1") || name.includes("c2") || name.includes("ileri")) {
    return {
      bg: "bg-purple-50 dark:bg-purple-955/30 hover:bg-purple-100/90 dark:hover:bg-purple-955/50 border-purple-300 dark:border-purple-800",
      border: "border-purple-600",
      text: "text-purple-955 dark:text-purple-50 font-bold",
      sub: "text-purple-700 dark:text-purple-300",
      dot: "bg-purple-600"
    };
  } else if (name.includes("a2") || name.includes("temel")) {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-955/30 hover:bg-emerald-100/90 dark:hover:bg-emerald-955/50 border-emerald-300 dark:border-emerald-800",
      border: "border-emerald-600",
      text: "text-emerald-955 dark:text-emerald-50 font-bold",
      sub: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-600"
    };
  } else if (name.includes("b2") || name.includes("orta")) {
    return {
      bg: "bg-amber-50 dark:bg-amber-955/30 hover:bg-amber-100/90 dark:hover:bg-amber-955/50 border-amber-300 dark:border-amber-800",
      border: "border-amber-600",
      text: "text-amber-955 dark:text-amber-50 font-bold",
      sub: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-600"
    };
  } else {
    return {
      bg: "bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-750/90 border-slate-400 dark:border-slate-600",
      border: "border-slate-600",
      text: "text-slate-950 dark:text-slate-50 font-extrabold",
      sub: "text-slate-750 dark:text-slate-350",
      dot: "bg-slate-600"
    };
  }
}

function getDayOfWeekIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export default function ProgramPage() {
  const { language, t } = useLanguage();
  const { data: apiData, isLoading, error, refetch } = trpc.classes.listSlots.useQuery();
  const { data: teachersList } = trpc.teachers.list.useQuery();
  const { data: classesList } = trpc.classes.list.useQuery();
  const { data: classroomsList, refetch: refetchClassrooms } = trpc.classes.listClassrooms.useQuery();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for adding/editing lessons
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");

  // Filters state
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  // Classroom manager states
  const [classroomManagerOpen, setClassroomManagerOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState("");
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [editingClassroomName, setEditingClassroomName] = useState("");

  // Day details modal states
  const [dayDetailsModalOpen, setDayDetailsModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  // Filter lessons
  const filteredLessons = (apiData || []).filter((lesson) => {
    if (selectedTeacher && lesson.teacher_name !== selectedTeacher) return false;
    if (selectedClass && lesson.class_name !== selectedClass) return false;
    if (selectedRoom && lesson.room_name !== selectedRoom) return false;
    return true;
  });

  // Mutations
  const createSlotMutation = trpc.classes.createSlot.useMutation();
  const updateSlotMutation = trpc.classes.updateSlot.useMutation();
  const deleteSlotMutation = trpc.classes.deleteSlot.useMutation();
  const createClassroomMutation = trpc.classes.createClassroom.useMutation();
  const updateClassroomMutation = trpc.classes.updateClassroom.useMutation();
  const deleteClassroomMutation = trpc.classes.deleteClassroom.useMutation();

  // Extract unique options for filter dropdowns from backend data
  const uniqueTeachers = Array.from(new Set((apiData || []).map((l) => l.teacher_name))).filter(Boolean);
  const uniqueClasses = Array.from(new Set((apiData || []).map((l) => l.class_name))).filter(Boolean);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroomName.trim()) return;
    try {
      await createClassroomMutation.mutateAsync({ name: newClassroomName.trim() });
      setNewClassroomName("");
      refetchClassrooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateClassroom = async (id: string) => {
    if (!editingClassroomName.trim()) return;
    try {
      await updateClassroomMutation.mutateAsync({ id, name: editingClassroomName.trim() });
      setEditingClassroomId(null);
      setEditingClassroomName("");
      refetchClassrooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm(language === "tr" ? "Bu dersliği silmek istediğinize emin misiniz?" : "Are you sure you want to delete this classroom?")) return;
    try {
      await deleteClassroomMutation.mutateAsync({ id });
      refetchClassrooms();
    } catch (err) {
      console.error(err);
    }
  };

  const weekdays = useMemo(() => {
    return language === "tr"
      ? ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  }, [language]);

  // Calendar dates generation
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayIndex = getDayOfWeekIndex(firstDayOfMonth);
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month padding days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const date = new Date(year, month, i);
      cells.push({ date, isCurrentMonth: true });
    }
    
    // Next month padding days to reach 42 cells
    let nextMonthDay = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, nextMonthDay++);
      cells.push({ date, isCurrentMonth: false });
    }
    
    return cells;
  }, [currentDate]);

  // Generate actual lesson occurrences for the visible calendar cells
  const actualOccurrences = useMemo(() => {
    if (!apiData || apiData.length === 0 || calendarCells.length === 0) return [];
    
    // Find the latest date in the calendar cells to cap our generation loop
    const maxDate = new Date(calendarCells[calendarCells.length - 1].date);
    maxDate.setHours(23, 59, 59, 999);

    // Group the slots by class
    const slotsByClass: Record<string, typeof apiData> = {};
    for (const slot of filteredLessons) {
      if (!slotsByClass[slot.class_id]) {
        slotsByClass[slot.class_id] = [];
      }
      slotsByClass[slot.class_id].push(slot);
    }

    const occurrences: Array<typeof apiData[0] & { dateStr: string; date: Date }> = [];

    // For each class, generate occurrences from its creation date up to maxDate
    for (const classId of Object.keys(slotsByClass)) {
      const classSlots = slotsByClass[classId];
      const firstSlot = classSlots[0];
      const quantity = (firstSlot as any).class_quantity || 0;
      const quantityType = (firstSlot as any).class_quantity_type || "classes";
      
      const creationDate = new Date((firstSlot as any).class_created_at);
      creationDate.setHours(0, 0, 0, 0);

      // Start loop from the creation date
      let loopDate = new Date(creationDate);
      let count = 0;
      let hours = 0;

      // We'll loop up to maxDate, incrementing day-by-day.
      // To avoid infinite loops in case of corrupt dates, cap at 365 days max.
      const capDate = new Date(creationDate);
      capDate.setDate(capDate.getDate() + 365);
      const loopCap = maxDate < capDate ? maxDate : capDate;

      while (loopDate <= loopCap) {
        const dayOfWeekIndex = getDayOfWeekIndex(loopDate);
        // Find slots for this day of week
        const daySlots = classSlots.filter((s) => Number(s.day_of_week) === dayOfWeekIndex)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        for (const slot of daySlots) {
          // If we have a limit set, check if we've reached it
          if (quantity > 0) {
            if (quantityType === "classes" && count >= quantity) {
              break;
            }
            if (quantityType === "hours" && hours >= quantity) {
              break;
            }
          }

          // Calculate duration in hours
          const [sh, sm] = slot.start_time.split(":").map(Number);
          const [eh, em] = slot.end_time.split(":").map(Number);
          const duration = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

          // Record this occurrence
          occurrences.push({
            ...slot,
            date: new Date(loopDate),
            dateStr: loopDate.toDateString(),
          });

          count += 1;
          hours += duration;
        }

        // Move to next day
        loopDate.setDate(loopDate.getDate() + 1);
      }
    }

    return occurrences;
  }, [filteredLessons, calendarCells, apiData]);

  const selectedDayLessons = useMemo(() => {
    if (!selectedDayDate) return [];
    const dateStr = selectedDayDate.toDateString();
    return actualOccurrences.filter((occ) => occ.dateStr === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [selectedDayDate, actualOccurrences]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreateModal = () => {
    setEditingSlotId(null);
    setClassId("");
    setTeacherId("");
    setRoomName("Sınıf 1");
    setSelectedDays([0]);
    setStartTime("09:00");
    setEndTime("09:50");
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenCreateModalForDay = (date: Date) => {
    setEditingSlotId(null);
    setClassId("");
    setTeacherId("");
    setRoomName("Sınıf 1");
    setSelectedDays([getDayOfWeekIndex(date)]);
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
    setSelectedDays([Number(lesson.day_of_week)]);
    setStartTime(lesson.start_time);
    setEndTime(lesson.end_time);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !teacherId || selectedDays.length === 0) return;

    setErrorMsg(null);

    try {
      if (editingSlotId) {
        await updateSlotMutation.mutateAsync({
          id: editingSlotId,
          data: {
            class_id: classId,
            teacher_id: teacherId,
            room_name: roomName,
            day_of_week: selectedDays[0] ?? 0,
            start_time: startTime,
            end_time: endTime,
          },
        });
        setSuccessMsg("Ders programı başarıyla güncellendi.");
      } else {
        // Create slot for each selected weekday
        for (const day of selectedDays) {
          await createSlotMutation.mutateAsync({
            class_id: classId,
            teacher_id: teacherId,
            room_name: roomName,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            status: "scheduled",
          });
        }
        setSuccessMsg("Yeni dersler başarıyla eklendi.");
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
  const todayStr = new Date().toDateString();

  return (
    <AdminShell 
      title={language === "tr" ? "Aylık Ders Programı" : "Monthly Class Schedule"} 
      subtitle={language === "tr" ? "Tüm sınıfların ve öğretmenlerin aylık ders programını yönetin." : "Manage monthly schedules for all classes and teachers."}
    >
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-all duration-200 cursor-pointer"
              title={language === "tr" ? "Önceki Ay" : "Previous Month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center min-w-[120px] justify-center">
              {t(`month_${currentDate.getMonth()}` as any)} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-all duration-200 cursor-pointer"
              title={language === "tr" ? "Sonraki Ay" : "Next Month"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            {language === "tr" ? "Bugün" : "Today"}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div>
            {successMsg && (
              <span className="text-xs font-semibold text-emerald-605 dark:text-emerald-450 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200 dark:border-emerald-900/40 px-3 py-1.5 rounded-lg animate-fade-in">
                <Check className="h-3.5 w-3.5" /> {successMsg}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setClassroomManagerOpen(true)}
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {language === "tr" ? "Derslikleri Yönet" : "Manage Classrooms"}
            </button>
            <button 
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {language === "tr" ? "Yeni Ders Ekle" : "Add New Lesson"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800/80 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400 text-xs font-bold mr-2 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-slate-400" />
            {language === "tr" ? "Filtreler" : "Filters"}
          </div>

          {/* Teacher Filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">{language === "tr" ? "Öğretmen Seçin" : "Select Teacher"}</option>
            {uniqueTeachers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">{language === "tr" ? "Sınıf Seçin" : "Select Class"}</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Room Filter */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">{language === "tr" ? "Derslik Seçin" : "Select Classroom"}</option>
            {classroomsList?.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {language === "tr" ? "Filtreleri Temizle" : "Clear Filters"}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <Loader2 className="h-6 w-6 text-primary animate-spin mr-2" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{language === "tr" ? "Ders programı yükleniyor…" : "Loading schedule..."}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/40 text-red-705 dark:text-red-300 rounded-xl p-4 text-sm font-semibold mb-6">
          {language === "tr" ? "API Hatası — Sunucu bağlantısı kurulamadı." : "API Error — Failed to connect to server."}
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && !error && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {weekdays.map((day) => (
              <div 
                key={day} 
                className="py-3 text-center text-[10px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 last:border-r-0 dark:border-slate-800"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, idx) => {
              const cellDayOfWeek = getDayOfWeekIndex(cell.date);
              const isToday = cell.date.toDateString() === todayStr;
              
              // Filter occurrences falling on this specific day's date
              const cellLessons = actualOccurrences.filter((occ) => occ.dateStr === cell.date.toDateString());
              // Sort lessons chronologically
              const sortedLessons = [...cellLessons].sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedDayDate(cell.date);
                    setDayDetailsModalOpen(true);
                  }}
                  className={`min-h-[140px] p-2 border-r border-b border-slate-200 dark:border-slate-850 last:border-r-0 [(&:nth-child(7n))]:border-r-0 relative group flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    cell.isCurrentMonth 
                      ? "bg-white dark:bg-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-800/20" 
                      : "bg-slate-50/20 dark:bg-slate-950/10 text-slate-400 dark:text-slate-600"
                  } ${
                    isToday ? "ring-2 ring-primary ring-inset bg-blue-50/10 dark:bg-blue-950/5" : ""
                  }`}
                >
                  <div>
                    {/* Header of cell */}
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[12px] font-bold h-6 w-6 flex items-center justify-center rounded-full ${
                        isToday 
                          ? "bg-primary text-white" 
                          : cell.isCurrentMonth
                            ? "text-slate-950 dark:text-slate-100 font-extrabold" 
                            : "text-slate-400 dark:text-slate-600"
                      }`}>
                        {cell.date.getDate()}
                      </span>
                      {isToday && (
                        <span className="text-[8px] font-extrabold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 scale-90">
                          {language === "tr" ? "BUGÜN" : "TODAY"}
                        </span>
                      )}
                    </div>

                    {/* Lesson items list */}
                    <div className="space-y-1 mt-1 max-h-[160px] overflow-y-auto pr-0.5 custom-scrollbar">
                      {sortedLessons.map((lesson) => {
                        const theme = getLessonTheme(lesson.class_name);
                        return (
                          <div
                            key={lesson.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(lesson);
                            }}
                            className={`${theme.bg} border-l-2 ${theme.border} border border-slate-200/60 dark:border-slate-800/20 rounded-md p-1.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer relative group/lesson`}
                            title={language === "tr" ? "Dersi Düzenle / Sil" : "Edit / Delete Lesson"}
                          >
                            <div className={`text-[11px] leading-tight pr-4 truncate ${theme.text}`}>
                              {lesson.class_name}
                            </div>
                            {lesson.teacher_name && (
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 mt-0.5 font-semibold truncate">
                                <User className="h-2.5 w-2.5 text-slate-400" />
                                <span>{lesson.teacher_name}</span>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 font-semibold">
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5 text-slate-500" />
                                <span>{lesson.start_time} - {lesson.end_time}</span>
                              </span>
                              {lesson.room_name && (
                                <span className="flex items-center gap-0.5 text-slate-550 dark:text-slate-400">
                                  <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                  <span>{lesson.room_name}</span>
                                </span>
                              )}
                            </div>

                            {/* Quick Delete Trash Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(lesson.id);
                              }}
                              className="absolute top-1 right-1 p-0.5 rounded bg-white/95 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 border border-slate-200/50 dark:border-slate-700/50 shadow-sm opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-200 cursor-pointer"
                              title={language === "tr" ? "Dersi Sil" : "Delete Lesson"}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add button visible on cell hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateModalForDay(cell.date);
                    }}
                    className="mt-2 w-full py-1 border border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 dark:border-slate-750 dark:hover:border-primary/50 text-[10px] text-slate-400 hover:text-primary rounded-md flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{language === "tr" ? "Ders Ekle" : "Add Lesson"}</span>
                  </button>
                </div>
              );
            })}
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
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {editingSlotId 
                  ? (language === "tr" ? "Dersi Düzenle" : "Edit Lesson") 
                  : (language === "tr" ? "Yeni Ders Ekle" : "Add New Lesson")}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-605 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveLesson} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {language === "tr" ? "Sınıf Seçin" : "Select Class"}
                </label>
                <select 
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">{language === "tr" ? "Sınıf Seçin" : "Select Class"}</option>
                  {classesList?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.levelCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {language === "tr" ? "Öğretmen Seçin" : "Select Teacher"}
                </label>
                <select 
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">{language === "tr" ? "Öğretmen Seçin" : "Select Teacher"}</option>
                  {teachersList?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.branch})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {language === "tr" ? "Derslik / Sınıf" : "Room / Classroom"}
                </label>
                <select
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">{language === "tr" ? "Derslik Seçin" : "Select Classroom"}</option>
                  {classroomsList?.map((room) => (
                    <option key={room.id} value={room.name}>{room.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {language === "tr" ? "Gün" : "Day"}
                </label>
                {editingSlotId ? (
                  <select
                    value={selectedDays[0] ?? 0}
                    onChange={(e) => setSelectedDays([Number(e.target.value)])}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer"
                  >
                    {weekdays.map((day, idx) => (
                      <option key={day} value={idx}>{day}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {weekdays.map((day, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      const shortName = day.slice(0, 3);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedDays.length > 1) {
                                setSelectedDays(selectedDays.filter((d) => d !== idx));
                              }
                            } else {
                              setSelectedDays([...selectedDays, idx]);
                            }
                          }}
                          className={`flex-1 min-w-[45px] py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
                          }`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {language === "tr" ? "Başlangıç Saati" : "Start Time"}
                  </label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {language === "tr" ? "Bitiş Saati" : "End Time"}
                  </label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-850">
                <div>
                  {editingSlotId && (
                    <button
                      type="button"
                      onClick={handleDeleteLessonFromModal}
                      disabled={deleteSlotMutation.isPending}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {language === "tr" ? "Dersi Sil" : "Delete Lesson"}
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {language === "tr" ? "İptal" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {(createSlotMutation.isPending || updateSlotMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {language === "tr" ? "Kaydet" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {dayDetailsModalOpen && selectedDayDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setDayDetailsModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {selectedDayDate.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === "tr" ? "Bugüne ait ders programı detayları" : "Schedule details for this day"}
                </p>
              </div>
              <button 
                onClick={() => setDayDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-605 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lesson List */}
            <div className="py-4 space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedDayLessons.length === 0 ? (
                <div className="text-center py-12 text-slate-405 dark:text-slate-500 text-sm font-medium">
                  {language === "tr" ? "Bu güne ait planlanmış bir ders bulunmamaktadır." : "No lessons scheduled for this day."}
                </div>
              ) : (
                selectedDayLessons.map((lesson) => {
                  const theme = getLessonTheme(lesson.class_name);
                  return (
                    <div 
                      key={lesson.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 ${theme.bg} transition-all duration-200 relative group/item`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {lesson.class_name}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-350 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lesson.start_time} - {lesson.end_time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lesson.room_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 mt-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lesson.teacher_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3 sm:mt-0 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDayDetailsModalOpen(false);
                            handleOpenEditModal(lesson);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-all border border-primary/20 bg-white/80 dark:bg-slate-800/80 cursor-pointer"
                        >
                          {language === "tr" ? "Düzenle" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteLesson(lesson.id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all border border-rose-200 dark:border-rose-900/40 bg-white/80 dark:bg-slate-800/80 cursor-pointer"
                        >
                          {language === "tr" ? "Sil" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Add Lesson Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDayDetailsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {language === "tr" ? "Kapat" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDayDetailsModalOpen(false);
                  handleOpenCreateModalForDay(selectedDayDate);
                }}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {language === "tr" ? "Yeni Ders Ekle" : "Add Lesson"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Manager Modal */}
      {classroomManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setClassroomManagerOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {language === "tr" ? "Derslikleri Yönet" : "Manage Classrooms"}
              </h3>
              <button 
                onClick={() => setClassroomManagerOpen(false)}
                className="text-slate-400 hover:text-slate-605 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Classroom Form */}
            <form onSubmit={handleCreateClassroom} className="flex gap-2 py-4 border-b border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newClassroomName}
                onChange={(e) => setNewClassroomName(e.target.value)}
                placeholder={language === "tr" ? "Yeni Derslik Adı (örn. Sınıf 5)" : "New Classroom Name (e.g. Room 5)"}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                required
              />
              <button
                type="submit"
                disabled={createClassroomMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                {createClassroomMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {language === "tr" ? "Ekle" : "Add"}
              </button>
            </form>

            {/* Classroom List */}
            <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {classroomsList?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  {language === "tr" ? "Tanımlı derslik bulunmuyor." : "No classrooms defined yet."}
                </div>
              ) : (
                classroomsList?.map((room) => (
                  <div 
                    key={room.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-955/20"
                  >
                    {editingClassroomId === room.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingClassroomName}
                          onChange={(e) => setEditingClassroomName(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-750 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateClassroom(room.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded transition-all cursor-pointer"
                          title={language === "tr" ? "Kaydet" : "Save"}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassroomId(null);
                            setEditingClassroomName("");
                          }}
                          className="p-1 text-slate-405 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded transition-all cursor-pointer"
                          title={language === "tr" ? "İptal" : "Cancel"}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          {room.name}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassroomId(room.id);
                              setEditingClassroomName(room.name);
                            }}
                            className="text-xs font-bold text-primary hover:text-blue-600 px-2 py-1 bg-primary/5 hover:bg-primary/10 rounded transition-all cursor-pointer"
                          >
                            {language === "tr" ? "Düzenle" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClassroom(room.id)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-606 px-2 py-1 bg-rose-500/5 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                          >
                            {language === "tr" ? "Sil" : "Delete"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

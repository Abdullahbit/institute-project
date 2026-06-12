"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Calendar as CalendarIcon, Clock, MapPin, User as UserIcon } from "lucide-react";

const daysOfWeek = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export default function ParentSchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children, isLoading: loadingChildren } = trpc.parents.getMyChildren.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id);
    }
  }, [children, selectedChildId]);

  const { data: schedule, isLoading: loadingSchedule } = trpc.parents.getChildSchedule.useQuery(
    { student_id: selectedChildId! },
    { enabled: !!selectedChildId }
  );

  if (authLoading || loadingChildren) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Group schedule by day
  const scheduleByDay: Record<number, typeof schedule> = {};
  if (schedule) {
    schedule.forEach((slot) => {
      if (!scheduleByDay[slot.day_of_week]) {
        scheduleByDay[slot.day_of_week] = [];
      }
      scheduleByDay[slot.day_of_week]!.push(slot);
    });
  }

  // Current day
  const todayIndex = new Date().getDay();

  return (
    <AdminShell title="Ders Programı" subtitle="Haftalık planlanan ders saatleri">
      {/* Child Selector */}
      {children && children.length > 1 && (
        <div className="mb-8 flex gap-2 flex-wrap">
          {children.map((child) => (
            <button
              key={child.student_id}
              onClick={() => setSelectedChildId(child.student_id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                selectedChildId === child.student_id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {child.student_name}
            </button>
          ))}
        </div>
      )}

      {loadingSchedule ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !schedule || schedule.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Ders Programı Bulunmuyor</h3>
          <p className="text-sm text-slate-500 mt-2">Bu öğrencinin sınıfına ait planlanmış bir ders programı yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
            const daySlots = scheduleByDay[dayIndex];
            if (!daySlots || daySlots.length === 0) return null;

            const isToday = dayIndex === todayIndex;

            return (
              <div 
                key={dayIndex} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                  isToday ? "border-primary/50 shadow-primary/10" : "border-slate-200/60"
                }`}
              >
                <div className={`px-5 py-3 border-b ${
                  isToday ? "bg-primary/10 border-primary/20" : "bg-slate-50 border-slate-100"
                }`}>
                  <h3 className={`font-bold text-sm flex items-center gap-2 ${
                    isToday ? "text-primary" : "text-slate-700"
                  }`}>
                    {daysOfWeek[dayIndex]} {isToday && <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-primary text-white ml-auto">Bugün</span>}
                  </h3>
                </div>
                
                <div className="p-2 space-y-2">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <Clock className="h-4 w-4 text-blue-500" />
                          {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {slot.class_name}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold">{slot.teacher_name}</span>
                        <span className="text-slate-400">({slot.teacher_branch})</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>Sınıf: <span className="font-semibold text-slate-700">{slot.room_name}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

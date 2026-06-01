"use client";

import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";

const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function ProgramPage() {
  const { data, isLoading } = trpc.schedule.list.useQuery();

  return (
    <AdminShell title="Haftalık Program" subtitle="Redis cache + schedule.list">
      {isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((slot) => (
            <div
              key={slot.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
            >
              <p className="text-xs text-slate-500">
                {days[slot.day_of_week]} · {slot.start_time}–{slot.end_time}
              </p>
              <p className="font-medium mt-1">{slot.class_name}</p>
              <p className="text-sm text-slate-600">{slot.teacher_name}</p>
              <p className="text-xs text-slate-400 mt-2">{slot.room_name}</p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

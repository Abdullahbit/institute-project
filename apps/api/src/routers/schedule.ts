import { listScheduleInputSchema, scheduleSlotSchema } from "@institute/types";
import { z } from "zod";
import { mockSchedule } from "../lib/mock-data";
import { getCachedSchedule } from "../lib/redis";
import { getSupabaseAdmin } from "../lib/supabase";
import { hasSupabase } from "../lib/env";
import { router, schoolProcedure } from "../trpc/trpc";

export const scheduleRouter = router({
  list: schoolProcedure
    .input(listScheduleInputSchema.optional())
    .output(z.array(scheduleSlotSchema))
    .query(async ({ ctx, input }) => {
      return getCachedSchedule(ctx.schoolId, async () => {
        const supabase = getSupabaseAdmin();

        if (!hasSupabase() || !supabase) {
          return z.array(scheduleSlotSchema).parse(
            mockSchedule.filter((s) => s.school_id === ctx.schoolId),
          );
        }

        const { data: slots, error } = await supabase
          .from("schedule_slots")
          .select(
            `
            *,
            classes ( name ),
            teachers ( full_name )
          `,
          )
          .eq("school_id", ctx.schoolId)
          .eq("is_active", true);

        if (error) throw error;

        let rows = (slots ?? []).map((row) => ({
          id: row.id,
          school_id: row.school_id,
          class_id: row.class_id,
          teacher_id: row.teacher_id,
          room_name: row.room_name,
          class_name: (row.classes as { name: string } | null)?.name ?? "",
          teacher_name: (row.teachers as { full_name: string } | null)?.full_name ?? "",
          day_of_week: row.day_of_week,
          start_time: String(row.start_time).slice(0, 5),
          end_time: String(row.end_time).slice(0, 5),
          student_count: 0,
          status: row.status,
          is_active: row.is_active,
        }));

        if (input?.teacher_id) {
          rows = rows.filter((r) => r.teacher_id === input.teacher_id);
        }

        return z.array(scheduleSlotSchema).parse(rows);
      });
    }),
});

import { listTeachersInputSchema, teacherSchema } from "@institute/types";
import { z } from "zod";
import { mockTeachers } from "../lib/mock-data.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { hasSupabase } from "../lib/env.js";
import { router, schoolProcedure } from "../trpc/trpc.js";

export const teachersRouter = router({
  list: schoolProcedure
    .input(listTeachersInputSchema.optional())
    .output(z.array(teacherSchema))
    .query(async ({ ctx, input }: { ctx: any, input: any }) => {
      const supabase = getSupabaseAdmin();

      if (!hasSupabase() || !supabase) {
        let rows = mockTeachers.filter((t: any) => t.school_id === ctx.schoolId);
        if (input?.status) rows = rows.filter((t: any) => t.status === input.status);
        return z.array(teacherSchema).parse(rows);
      }

      let query = supabase
        .from("teachers")
        .select("*")
        .eq("school_id", ctx.schoolId)
        .eq("is_active", true);

      if (input?.status) {
        query = query.eq("status", input.status);
      }

      const { data, error } = await query.order("full_name");
      if (error) throw error;

      return z.array(teacherSchema).parse(
        (data ?? []).map((row: any) => ({
          id: row.id,
          school_id: row.school_id,
          user_id: row.user_id,
          full_name: row.full_name,
          branch: row.branch,
          status: row.status,
          active_class_count: row.active_class_count,
          monthly_hours: Number(row.monthly_hours),
          is_active: row.is_active,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        })),
      );
    }),
});

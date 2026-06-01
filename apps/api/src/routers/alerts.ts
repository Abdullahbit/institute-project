import { alertSchema, listAlertsInputSchema } from "@institute/types";
import { z } from "zod";
import { mockAlerts } from "../lib/mock-data";
import { getSupabaseAdmin } from "../lib/supabase";
import { hasSupabase } from "../lib/env";
import { router, schoolProcedure } from "../trpc/trpc";

export const alertsRouter = router({
  list: schoolProcedure
    .input(listAlertsInputSchema.optional())
    .output(z.array(alertSchema))
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;
      const supabase = getSupabaseAdmin();

      if (!hasSupabase() || !supabase) {
        let rows = mockAlerts.filter((a) => a.school_id === ctx.schoolId);
        if (input?.resolved !== undefined) {
          rows = rows.filter((a) => a.is_resolved === input.resolved);
        }
        return z.array(alertSchema).parse(rows.slice(0, limit));
      }

      let query = supabase
        .from("alerts")
        .select("*, teachers(full_name)")
        .eq("school_id", ctx.schoolId)
        .eq("is_active", true)
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (input?.resolved !== undefined) {
        query = query.eq("is_resolved", input.resolved);
      }

      const { data, error } = await query;
      if (error) throw error;

      return z.array(alertSchema).parse(
        (data ?? []).map((row) => ({
          id: row.id,
          school_id: row.school_id,
          type: row.type,
          teacher_id: row.teacher_id,
          teacher_name:
            (row.teachers as { full_name: string } | null)?.full_name ?? null,
          title: row.title,
          description: row.description,
          occurred_at: row.occurred_at,
          is_resolved: row.is_resolved,
          created_at: row.created_at,
        })),
      );
    }),
});

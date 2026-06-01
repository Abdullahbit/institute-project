import { dashboardSummarySchema } from "@institute/types";
import { mockDashboard } from "../lib/mock-data";
import { getSupabaseAdmin } from "../lib/supabase";
import { hasSupabase } from "../lib/env";
import { router, schoolProcedure } from "../trpc/trpc";

export const dashboardRouter = router({
  summary: schoolProcedure.query(async ({ ctx }) => {
    const supabase = getSupabaseAdmin();

    if (!hasSupabase() || !supabase) {
      return dashboardSummarySchema.parse(mockDashboard);
    }

    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, status")
      .eq("school_id", ctx.schoolId)
      .eq("is_active", true);

    const { data: alerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("school_id", ctx.schoolId)
      .eq("is_active", true)
      .eq("is_resolved", false)
      .order("occurred_at", { ascending: false })
      .limit(5);

    const activeTeachers =
      teachers?.filter((t) => t.status === "active").length ?? 0;

    const summary = {
      ...mockDashboard,
      active_teachers: activeTeachers,
      recent_alerts:
        alerts?.map((a) => ({
          id: a.id,
          school_id: a.school_id,
          type: a.type,
          teacher_id: a.teacher_id,
          teacher_name: null,
          title: a.title,
          description: a.description,
          occurred_at: a.occurred_at,
          is_resolved: a.is_resolved,
          created_at: a.created_at,
        })) ?? mockDashboard.recent_alerts,
    };

    return dashboardSummarySchema.parse(summary);
  }),
});

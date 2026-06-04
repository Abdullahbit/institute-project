import { z } from "zod";
import { alertSchema } from "./alert.js";
import { todayLessonSchema } from "./schedule.js";

export const dashboardSummarySchema = z.object({
  lessons_today: z.number().int().nonnegative(),
  active_teachers: z.number().int().nonnegative(),
  total_students: z.number().int().nonnegative(),
  pending_approvals: z.number().int().nonnegative(),
  today_schedule: z.array(todayLessonSchema),
  recent_alerts: z.array(alertSchema),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

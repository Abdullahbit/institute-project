import { z } from "zod";
import { uuidSchema } from "./common.js";

export const lessonStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "ongoing",
  "completed",
  "cancelled",
  "substitute_needed",
  "late",
  "no_show",
]);

export const scheduleSlotSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  class_id: uuidSchema,
  teacher_id: uuidSchema,
  room_name: z.string(),
  class_name: z.string(),
  teacher_name: z.string(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  student_count: z.number().int().nonnegative(),
  status: lessonStatusSchema,
  is_active: z.boolean(),
  cancelled_dates: z.array(z.string()).optional(),
});

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

export const listScheduleInputSchema = z.object({
  week_start: z.string().date().optional(),
  teacher_id: uuidSchema.optional(),
  class_level: z.string().optional(),
});

export const todayLessonSchema = z.object({
  id: uuidSchema,
  class_id: uuidSchema.optional(),
  level_code: z.string().optional(),
  time_label: z.string(),
  class_name: z.string(),
  teacher_name: z.string(),
  student_count: z.number().int().nonnegative(),
  status: lessonStatusSchema,
});

export type TodayLesson = z.infer<typeof todayLessonSchema>;

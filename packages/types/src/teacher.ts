import { z } from "zod";
import { uuidSchema } from "./common.js";

export const teacherStatusSchema = z.enum(["active", "on_leave", "inactive"]);

export const teacherSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  full_name: z.string().min(1),
  branch: z.string().min(1),
  status: teacherStatusSchema,
  active_class_count: z.number().int().nonnegative(),
  monthly_hours: z.number().nonnegative(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Teacher = z.infer<typeof teacherSchema>;

export const listTeachersInputSchema = z.object({
  status: teacherStatusSchema.optional(),
});

export const createTeacherInputSchema = z.object({
  full_name: z.string().min(1),
  branch: z.string().min(1),
  status: teacherStatusSchema.default("active"),
});

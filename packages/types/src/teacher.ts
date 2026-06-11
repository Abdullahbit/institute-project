import { z } from "zod";
import { uuidSchema } from "./common.js";

export const teacherStatusSchema = z.enum(["active", "on_leave", "inactive"]);

export const teacherSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  full_name: z.string().min(1),
  email: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
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
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, { message: "Geçersiz telefon numarası formatı (örn: +905551234567)" }).optional(),
  status: teacherStatusSchema.default("active"),
});

export const updateTeacherInputSchema = z.object({
  full_name: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, { message: "Geçersiz telefon numarası formatı (örn: +905551234567)" }).optional(),
  status: teacherStatusSchema.optional(),
  is_active: z.boolean().optional(),
});


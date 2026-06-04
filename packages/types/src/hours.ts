import { z } from "zod";
import { uuidSchema } from "./common.js";

export const classTypeSchema = z.enum(["group", "private", "online"]);

export const hourLogStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const hourLogSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  teacher_id: uuidSchema,
  lesson_session_id: uuidSchema.nullable(),
  hours: z.number().positive(),
  status: hourLogStatusSchema,
  notes: z.string().nullable().optional(),
  class_type: classTypeSchema.nullable().optional(),
  log_date: z.string().nullable().optional(),
  is_active: z.boolean(),
  logged_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  audit_trail: z.array(z.record(z.any())),
});

export type HourLog = z.infer<typeof hourLogSchema>;

export const createManualHourLogInputSchema = z.object({
  log_date: z.string().date(),
  class_type: classTypeSchema,
  duration_minutes: z.number().int().positive(),
  notes: z.string().optional(),
});

export type CreateManualHourLogInput = z.infer<typeof createManualHourLogInputSchema>;

import { z } from "zod";
import { uuidSchema } from "./common.js";

export const createClassInputSchema = z.object({
  name: z.string().min(1),
  level_code: z.string().min(1),
  is_active: z.boolean().default(true),
});

export const updateClassInputSchema = z.object({
  name: z.string().min(1).optional(),
  level_code: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

export const createSlotInputSchema = z.object({
  class_id: uuidSchema,
  teacher_id: uuidSchema,
  room_name: z.string().min(1),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Geçersiz saat formatı (HH:MM)" }),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Geçersiz saat formatı (HH:MM)" }),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "substitute_needed"]).default("scheduled"),
});

export const updateSlotInputSchema = z.object({
  class_id: uuidSchema.optional(),
  teacher_id: uuidSchema.optional(),
  room_name: z.string().min(1).optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Geçersiz saat formatı (HH:MM)" }).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Geçersiz saat formatı (HH:MM)" }).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "substitute_needed"]).optional(),
  is_active: z.boolean().optional(),
});

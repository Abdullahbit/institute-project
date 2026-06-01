import { z } from "zod";
import { uuidSchema } from "./common";

export const alertTypeSchema = z.enum([
  "late_check_in",
  "substitute_request",
  "no_show",
  "hour_approval",
  "other",
]);

export const alertSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  type: alertTypeSchema,
  teacher_id: uuidSchema.nullable(),
  teacher_name: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  occurred_at: z.string().datetime(),
  is_resolved: z.boolean(),
  created_at: z.string().datetime(),
});

export type Alert = z.infer<typeof alertSchema>;

export const listAlertsInputSchema = z.object({
  resolved: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

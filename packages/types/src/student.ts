import { z } from "zod";
import { uuidSchema } from "./common.js";

export const logAttendanceInputSchema = z.object({
  session_id: uuidSchema,
  roster: z.array(
    z.object({
      student_id: uuidSchema,
      status: z.enum(["present", "absent", "late"]),
      notes: z.string().optional(),
    })
  ),
});

export const submitProgressReportInputSchema = z.object({
  student_id: uuidSchema,
  teacher_id: uuidSchema,
  level_code: z.string().min(1),
  score_listening: z.number().int().min(0).max(100),
  score_speaking: z.number().int().min(0).max(100),
  score_overall: z.number().int().min(0).max(100),
  notes: z.string().optional(),
});

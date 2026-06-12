import { z } from "zod";
import { uuidSchema } from "./common.js";

// Parent schema
export const parentSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  full_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Parent = z.infer<typeof parentSchema>;

// Create parent input
export const createParentInputSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  student_ids: z.array(uuidSchema).min(1, "En az bir öğrenci seçilmelidir"),
});

// Update parent input
export const updateParentInputSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Link parent to student
export const linkParentStudentInputSchema = z.object({
  parent_id: uuidSchema,
  student_id: uuidSchema,
  relationship: z.enum(["parent", "guardian"]).default("parent"),
});

// Behavior feedback category
export const behaviorCategorySchema = z.enum(["excellent", "good", "warning", "issue"]);

// Behavior feedback schema
export const behaviorFeedbackSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  student_id: uuidSchema,
  teacher_id: uuidSchema,
  lesson_session_id: uuidSchema.nullable().optional(),
  category: behaviorCategorySchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  feedback_date: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
});

export type BehaviorFeedback = z.infer<typeof behaviorFeedbackSchema>;

// Submit behavior feedback input
export const submitBehaviorFeedbackInputSchema = z.object({
  student_id: uuidSchema,
  lesson_session_id: uuidSchema.optional(),
  category: behaviorCategorySchema,
  title: z.string().min(1),
  description: z.string().optional(),
});

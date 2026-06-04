import { z } from "zod";
import { uuidSchema } from "./common.js";

export const invitationRoleSchema = z.enum(["admin", "teacher", "student"]);

export const invitationSchema = z.object({
  id: uuidSchema,
  school_id: uuidSchema,
  email: z.string().email(),
  role: invitationRoleSchema,
  token_hash: z.string(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
});

/** Invitation tokens must expire within 72 hours (PDF security rule). */
export const INVITATION_MAX_HOURS = 72;

export const createInvitationInputSchema = z.object({
  email: z.string().email(),
  role: invitationRoleSchema,
  expires_in_hours: z.number().int().min(1).max(INVITATION_MAX_HOURS).default(72),
});

export const acceptInvitationInputSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(2),
  password: z.string().min(6),
});


import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'teacher', 'student']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SchoolSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  branding: z.object({
    logo_url: z.string().url().optional(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
  }).nullable(),
  created_at: z.string(),
});
export type School = z.infer<typeof SchoolSchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: UserRoleSchema,
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(2),
  password: z.string().min(6),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;


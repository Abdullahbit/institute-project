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

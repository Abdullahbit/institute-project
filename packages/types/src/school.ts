import { z } from "zod";
import { uuidSchema } from "./common.js";

export const schoolSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type School = z.infer<typeof schoolSchema>;

export const createSchoolSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

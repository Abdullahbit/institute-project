import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { env } from "../lib/env.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export type TrpcContext = {
  schoolId: string;
  userId: string | null;
  logger: typeof logger;
  supabase: ReturnType<typeof getSupabaseAdmin>;
};

export function createContext({
  req,
}: CreateFastifyContextOptions): TrpcContext {
  const schoolId =
    (req.headers["x-school-id"] as string | undefined) ?? env.devSchoolId;
  const userId = (req.headers["x-user-id"] as string | undefined) ?? null;

  return {
    schoolId,
    userId,
    logger,
    supabase: getSupabaseAdmin(),
  };
}

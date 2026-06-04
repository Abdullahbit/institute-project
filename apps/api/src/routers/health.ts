import { router, publicProcedure } from "../trpc/trpc.js";

export const healthRouter = router({
  check: publicProcedure.query(() => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  })),
});

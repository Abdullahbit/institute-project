import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Every procedure must verify school_id from context (PDF rule). */
export const schoolProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.schoolId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "school_id is required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      schoolId: ctx.schoolId,
    },
  });
});

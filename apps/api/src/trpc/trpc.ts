import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context.js";
import { db } from "@workspace/db";
import { schools } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

/** Enforce active Stripe subscription status for core operations. */
export const subscribedProcedure = schoolProcedure.use(async ({ ctx, next }) => {
  const [school] = await db
    .select({ subscriptionStatus: schools.subscriptionStatus })
    .from(schools)
    .where(eq(schools.id, ctx.schoolId))
    .limit(1);

  if (!school || (school.subscriptionStatus !== "active" && school.subscriptionStatus !== "trialing")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bu işlemi gerçekleştirmek için aktif bir aboneliğinizin olması gerekmektedir.",
    });
  }

  return next();
});

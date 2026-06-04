import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { serve } from "inngest/fastify";
import { appRouter, type AppRouter } from "./routers/index.js";
import { createContext } from "./trpc/context.js";
import { inngest } from "./inngest/client.js";
import { inngestFunctions } from "./inngest/functions.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { hourLogs, teachers, profiles, schools } from "@workspace/db/schema";
import { eq, and, like } from "drizzle-orm";
import { getSupabaseAdmin } from "./lib/supabase.js";
import Stripe from "stripe";

export async function buildServer() {
  const app = Fastify({ logger: false });

  // Custom content type parser to preserve raw buffer body for Stripe webhook validation
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    if (req.url.startsWith("/api/webhooks/stripe")) {
      done(null, body);
    } else {
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        logger.error({ path, err: error }, "tRPC error");
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  // Use route registration instead of register() plugin directly to match serve()'s type signature
  await app.register(
    async (instance) => {
      instance.route({
        method: ["GET", "POST", "PUT"],
        url: "/",
        handler: serve({ client: inngest, functions: inngestFunctions }),
      });
    },
    { prefix: "/api/inngest" },
  );

  app.get("/healthz", async () => ({ status: "ok" }));

  // Stripe Multi-Tenant Webhook Listener
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    if (!sig || !webhookSecret) {
      logger.error("Stripe signature or webhook secret missing");
      return res.status(400).send({ error: "Webhook verification failed" });
    }

    let event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err: any) {
      logger.error(err, "Stripe signature verification failed");
      return res.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;
          const subId = subscription.id;
          const status = subscription.status;
          const schoolId = subscription.metadata?.school_id;
          const isSubActive = ["active", "trialing"].includes(status);

          if (schoolId) {
            await db
              .update(schools)
              .set({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subId,
                subscriptionStatus: status,
                isActive: isSubActive,
                updatedAt: new Date(),
              })
              .where(eq(schools.id, schoolId));
          } else {
            await db
              .update(schools)
              .set({
                stripeSubscriptionId: subId,
                subscriptionStatus: status,
                isActive: isSubActive,
                updatedAt: new Date(),
              })
              .where(eq(schools.stripeCustomerId, customerId));
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;
          const schoolId = subscription.metadata?.school_id;

          if (schoolId) {
            await db
              .update(schools)
              .set({
                subscriptionStatus: "canceled",
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(schools.id, schoolId));
          } else {
            await db
              .update(schools)
              .set({
                subscriptionStatus: "canceled",
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(schools.stripeCustomerId, customerId));
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          const customerId = invoice.customer;

          if (customerId) {
            await db
              .update(schools)
              .set({
                isActive: true,
                subscriptionStatus: "active",
                updatedAt: new Date(),
              })
              .where(eq(schools.stripeCustomerId, customerId));
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const customerId = invoice.customer;

          if (customerId) {
            await db
              .update(schools)
              .set({
                isActive: false,
                subscriptionStatus: "past_due",
                updatedAt: new Date(),
              })
              .where(eq(schools.stripeCustomerId, customerId));
          }
          break;
        }
      }

      return res.status(200).send({ received: true });
    } catch (dbErr) {
      logger.error(dbErr, "Database error during Stripe webhook processing");
      return res.status(500).send({ error: "Internal server error" });
    }
  });

  // Custom route for exporting hours in CSV format
  app.get("/api/hours/export", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(500).send({ error: "Supabase client not initialized" });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    // Fetch caller's profile to get schoolId
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile) {
      return res.status(403).send({ error: "Profile not found" });
    }

    const schoolId = profile.schoolId;

    // Determine target month from query parameter, fallback to current month (YYYY-MM)
    const query = req.query as { month?: string };
    const activeMonth = query.month || new Date().toISOString().slice(0, 7);

    // Fetch approved logs for the active month in the school
    const logs = await db
      .select({
        teacherName: teachers.fullName,
        logDate: hourLogs.logDate,
        classType: hourLogs.classType,
        hours: hourLogs.hours,
        status: hourLogs.status,
        notes: hourLogs.notes,
      })
      .from(hourLogs)
      .innerJoin(teachers, eq(hourLogs.teacherId, teachers.id))
      .where(
        and(
          eq(hourLogs.schoolId, schoolId),
          eq(hourLogs.status, "approved"),
          eq(hourLogs.isActive, true),
          like(hourLogs.logDate, `${activeMonth}-%`)
        )
      );

    // Build text-based CSV output
    let csvContent = "Teacher Name,Date,Class Type,Hours,Status,Notes\n";
    for (const log of logs) {
      const teacherName = (log.teacherName || "").replace(/"/g, '""');
      const date = log.logDate || "";
      const type = log.classType || "";
      const hours = log.hours || "0";
      const status = log.status || "";
      const notes = (log.notes || "").replace(/"/g, '""').replace(/\n/g, " ");
      csvContent += `"${teacherName}","${date}","${type}",${hours},"${status}","${notes}"\n`;
    }

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", `attachment; filename="hour_logs_${activeMonth}.csv"`);
    return csvContent;
  });

  return app;
}

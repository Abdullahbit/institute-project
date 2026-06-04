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
import { hourLogs, teachers, profiles } from "@workspace/db/schema";
import { eq, and, like } from "drizzle-orm";
import { getSupabaseAdmin } from "./lib/supabase.js";

export async function buildServer() {
  const app = Fastify({ logger: false });

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

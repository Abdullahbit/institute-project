import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { lessonSessions, scheduleSlots, teachers, alerts } from "@workspace/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { getSupabaseAdmin } from "../lib/supabase.js";

/** Background job: detect late check-ins and no-shows (PDF: Inngest). */
export const detectAttendanceIssues = inngest.createFunction(
  { id: "detect-attendance-issues", name: "Detect Late / No-Show" },
  { cron: "*/5 * * * *" }, // Runs every 5 minutes
  async ({ step }) => {
    await step.run("scan-lesson-sessions", async () => {
      logger.info("Running attendance scan for late/no-show detection");
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();

      // Fetch all today's active sessions that are not completed, cancelled, or no-show
      const activeSessions = await db
        .select({
          id: lessonSessions.id,
          schoolId: lessonSessions.schoolId,
          status: lessonSessions.status,
          sessionDate: lessonSessions.sessionDate,
          startTime: scheduleSlots.startTime,
          slotTeacherId: scheduleSlots.teacherId,
          sessionTeacherId: lessonSessions.teacherId,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .where(
          and(
            eq(lessonSessions.sessionDate, todayStr),
            eq(lessonSessions.isActive, true),
            inArray(lessonSessions.status, ["scheduled", "late"])
          )
        );

      let updatedCount = 0;

      for (const session of activeSessions) {
        const sessionStart = new Date(`${session.sessionDate}T${session.startTime}`);
        const diffMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
        const activeTeacherId = session.sessionTeacherId ?? session.slotTeacherId;

        // Fetch teacher's name
        const [teacher] = await db
          .select({ fullName: teachers.fullName })
          .from(teachers)
          .where(eq(teachers.id, activeTeacherId))
          .limit(1);

        const teacherName = teacher?.fullName ?? "Öğretmen";

        if (diffMinutes >= 30 && session.status !== "no_show") {
          // Mark as no_show
          await db
            .update(lessonSessions)
            .set({
              status: "no_show",
              updatedAt: now,
            })
            .where(eq(lessonSessions.id, session.id));

          // Generate alert
          await db.insert(alerts).values({
            schoolId: session.schoolId,
            type: "no_show",
            teacherId: activeTeacherId,
            title: "Devamsızlık (No-Show)",
            description: `${teacherName} dersin başlangıcından 30 dakika geçmesine rağmen giriş yapmadı.`,
            occurredAt: now,
            isResolved: false,
          });

          updatedCount++;
        } else if (diffMinutes >= 10 && session.status === "scheduled") {
          // Mark as late
          await db
            .update(lessonSessions)
            .set({
              status: "late",
              updatedAt: now,
            })
            .where(eq(lessonSessions.id, session.id));

          // Generate alert
          await db.insert(alerts).values({
            schoolId: session.schoolId,
            type: "late_check_in",
            teacherId: activeTeacherId,
            title: "Geç Giriş (Late Check-in)",
            description: `${teacherName} dersin başlangıcından 10 dakika geçmesine rağmen henüz giriş yapmadı.`,
            occurredAt: now,
            isResolved: false,
          });

          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        // Broadcast real-time event via Supabase Realtime
        const supabase = getSupabaseAdmin();
        if (supabase) {
          await supabase.channel("alerts").send({
            type: "broadcast",
            event: "alerts_update",
            payload: { message: "Attendance issues detected and updated." },
          });
        }
      }

      return { scanned: activeSessions.length, updated: updatedCount };
    });
  },
);

export const inngestFunctions = [detectAttendanceIssues];

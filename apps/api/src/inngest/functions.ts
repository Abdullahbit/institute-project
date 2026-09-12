import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { lessonSessions, scheduleSlots, teachers, alerts, profiles, classes } from "@workspace/db/schema";
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

/** Background job: send upcoming class notification to teachers 5 minutes before class. */
export const sendUpcomingClassReminders = inngest.createFunction(
  { id: "send-upcoming-class-reminders", name: "Send Upcoming Class Reminders" },
  { cron: "* * * * *" }, // Runs every minute
  async ({ step }) => {
    await step.run("check-and-notify", async () => {
      logger.info("Checking for upcoming classes starting in 5 minutes");

      const tz = process.env.TZ || "Europe/Istanbul";
      const targetTimeObj = new Date(Date.now() + 5 * 60 * 1000);

      // Find day of week in target timezone (0 = Sunday, 1 = Monday, etc.)
      const weekdayName = targetTimeObj.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
      const dayOfWeek = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      }[weekdayName];

      if (dayOfWeek === undefined) {
        logger.error(`Invalid weekdayName: ${weekdayName}`);
        return { count: 0 };
      }

      // Format time and date parts in target timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      const parts = formatter.formatToParts(targetTimeObj);
      const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

      const targetTimeHHMM = `${partMap.hour}:${partMap.minute}`;
      const targetTimeHHMMSS = `${partMap.hour}:${partMap.minute}:00`;
      const targetDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

      logger.info(`Target lookup: date=${targetDateStr}, dayOfWeek=${dayOfWeek}, time=${targetTimeHHMM}`);

      // Query schedule slots matching this time and day
      const slots = await db
        .select({
          id: scheduleSlots.id,
          schoolId: scheduleSlots.schoolId,
          classId: scheduleSlots.classId,
          className: classes.name,
          teacherId: scheduleSlots.teacherId,
          roomName: scheduleSlots.roomName,
          startTime: scheduleSlots.startTime,
          cancelledDates: scheduleSlots.cancelledDates,
        })
        .from(scheduleSlots)
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .where(
          and(
            eq(scheduleSlots.isActive, true),
            eq(scheduleSlots.dayOfWeek, dayOfWeek),
            or(
              eq(scheduleSlots.startTime, targetTimeHHMM),
              eq(scheduleSlots.startTime, targetTimeHHMMSS)
            )
          )
        );

      if (slots.length === 0) {
        return { count: 0 };
      }

      // Filter out slots that have today's date in their cancelledDates list
      const activeSlots = slots.filter((slot) => {
        const cancelledArray = (slot.cancelledDates as string[]) || [];
        return !cancelledArray.includes(targetDateStr);
      });

      if (activeSlots.length === 0) {
        return { count: 0 };
      }

      // Fetch any overriding lessonSessions for today
      const sessionRows = await db
        .select()
        .from(lessonSessions)
        .where(
          and(
            eq(lessonSessions.sessionDate, targetDateStr),
            eq(lessonSessions.isActive, true),
            inArray(
              lessonSessions.scheduleSlotId,
              activeSlots.map((s) => s.id)
            )
          )
        );

      // Collect target teacher IDs
      const teacherIds = activeSlots
        .map((slot) => {
          const session = sessionRows.find((s) => s.scheduleSlotId === slot.id);
          if (session?.status === "cancelled") {
            return null;
          }
          return session?.teacherId ?? slot.teacherId;
        })
        .filter((id): id is string => id !== null);

      if (teacherIds.length === 0) {
        return { count: 0 };
      }

      // Query teachers and their profiles to get expoPushToken
      const teachersData = await db
        .select({
          teacherId: teachers.id,
          fullName: teachers.fullName,
          expoPushToken: profiles.expoPushToken,
        })
        .from(teachers)
        .leftJoin(profiles, eq(teachers.userId, profiles.id))
        .where(inArray(teachers.id, teacherIds));

      let notificationCount = 0;

      for (const slot of activeSlots) {
        const session = sessionRows.find((s) => s.scheduleSlotId === slot.id);
        if (session?.status === "cancelled") {
          continue;
        }

        const activeTeacherId = session?.teacherId ?? slot.teacherId;
        const teacherInfo = teachersData.find((t) => t.teacherId === activeTeacherId);

        if (!teacherInfo) {
          continue;
        }

        const message = `Hello hocam, your ${slot.className} class at ${slot.roomName} is starting soon please be ready`;

        // 1. Write an alert record to database
        await db.insert(alerts).values({
          schoolId: slot.schoolId,
          type: "other",
          teacherId: activeTeacherId,
          title: "Upcoming Class Reminder",
          description: message,
          occurredAt: new Date(),
          isResolved: false,
        });

        // 2. Send push notification if push token is available
        if (teacherInfo.expoPushToken) {
          try {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify([
                {
                  to: teacherInfo.expoPushToken,
                  sound: "default",
                  title: "Class Reminder",
                  body: message,
                  data: {
                    slotId: slot.id,
                    classId: slot.classId,
                    className: slot.className,
                    roomName: slot.roomName,
                  },
                },
              ]),
            });
          } catch (err) {
            logger.error(err, `Failed to send push notification to teacher ${teacherInfo.fullName}`);
          }
        }

        notificationCount++;
      }

      return { count: notificationCount };
    });
  },
);

export const inngestFunctions = [detectAttendanceIssues, sendUpcomingClassReminders];


import { listScheduleInputSchema, scheduleSlotSchema, todayLessonSchema } from "@institute/types";
import { z } from "zod";
import { mockSchedule } from "../lib/mock-data.js";
import { getCachedSchedule } from "../lib/redis.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { hasSupabase } from "../lib/env.js";
import { router, schoolProcedure } from "../trpc/trpc.js";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { lessonSessions, scheduleSlots, classes, teachers, hourLogs } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";

export const scheduleRouter = router({
  list: schoolProcedure
    .input(listScheduleInputSchema.optional())
    .output(z.array(scheduleSlotSchema))
    .query(async ({ ctx, input }) => {
      return getCachedSchedule(ctx.schoolId, async () => {
        const supabase = getSupabaseAdmin();

        if (!hasSupabase() || !supabase) {
          return z.array(scheduleSlotSchema).parse(
            mockSchedule.filter((s) => s.school_id === ctx.schoolId),
          );
        }

        const { data: slots, error } = await supabase
          .from("schedule_slots")
          .select(
            `
            *,
            classes ( name ),
            teachers ( full_name )
          `,
          )
          .eq("school_id", ctx.schoolId)
          .eq("is_active", true);

        if (error) throw error;

        let rows = (slots ?? []).map((row) => ({
          id: row.id,
          school_id: row.school_id,
          class_id: row.class_id,
          teacher_id: row.teacher_id,
          room_name: row.room_name,
          class_name: (row.classes as { name: string } | null)?.name ?? "",
          teacher_name: (row.teachers as { full_name: string } | null)?.full_name ?? "",
          day_of_week: row.day_of_week,
          start_time: String(row.start_time).slice(0, 5),
          end_time: String(row.end_time).slice(0, 5),
          student_count: 0,
          status: row.status,
          is_active: row.is_active,
          cancelled_dates: (row.cancelled_dates as string[]) ?? [],
        }));

        if (input?.teacher_id) {
          rows = rows.filter((r) => r.teacher_id === input.teacher_id);
        }

        return z.array(scheduleSlotSchema).parse(rows);
      });
    }),

  getTodaySessions: schoolProcedure
    .input(z.object({ teacher_id: z.string().uuid() }))
    .output(z.array(todayLessonSchema))
    .query(async ({ ctx, input }) => {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Query sessions for today matching target teacher's ID
      // Joining lessonSessions, scheduleSlots, classes, and teachers
      const rows = await db
        .select({
          id: lessonSessions.id,
          classId: scheduleSlots.classId,
          levelCode: classes.levelCode,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          className: classes.name,
          teacherName: teachers.fullName,
          studentCount: lessonSessions.studentCount,
          status: lessonSessions.status,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(
          and(
            eq(lessonSessions.schoolId, ctx.schoolId),
            // Handled either recurring teacher or assigned cover teacher
            or(
              eq(scheduleSlots.teacherId, input.teacher_id),
              eq(lessonSessions.teacherId, input.teacher_id)
            ),
            eq(lessonSessions.sessionDate, todayStr),
            eq(lessonSessions.isActive, true),
            eq(scheduleSlots.isActive, true)
          )
        );

      return rows.map((r) => ({
        id: r.id,
        class_id: r.classId,
        level_code: r.levelCode,
        time_label: `${String(r.startTime).slice(0, 5)} - ${String(r.endTime).slice(0, 5)}`,
        class_name: r.className,
        teacher_name: r.teacherName,
        student_count: r.studentCount,
        status: r.status as any,
      }));
    }),

  generateDemoSessionsForToday: schoolProcedure
    .mutation(async ({ ctx }) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Generate sessions for today for all active schedule slots in the school
      const slots = await db
        .select()
        .from(scheduleSlots)
        .where(eq(scheduleSlots.schoolId, ctx.schoolId));
        
      if (slots.length === 0) return { success: true, message: "No schedule slots found" };

      for (const slot of slots) {
        // Check if session already exists for this slot today
        const existing = await db
          .select()
          .from(lessonSessions)
          .where(
            and(
              eq(lessonSessions.scheduleSlotId, slot.id),
              eq(lessonSessions.sessionDate, todayStr)
            )
          );

        if (existing.length === 0) {
          // Insert dummy session
          await db.insert(lessonSessions).values({
            schoolId: ctx.schoolId,
            scheduleSlotId: slot.id,
            teacherId: slot.teacherId,
            sessionDate: todayStr,
            studentCount: 5, // mock count
            status: "scheduled",
            isActive: true,
          });
        } else {
          // Update existing to scheduled if completed
          await db.update(lessonSessions)
            .set({ status: "scheduled", sessionDate: todayStr })
            .where(eq(lessonSessions.id, existing[0].id));
        }
      }
      return { success: true };
    }),

  checkIn: schoolProcedure
    .input(z.object({ session_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Fetch teacher record linked to authenticated user
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(
          and(
            eq(teachers.userId, ctx.userId),
            eq(teachers.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!teacher) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Teacher profile not found",
        });
      }

      // Fetch session and its schedule slot
      const [session] = await db
        .select({
          id: lessonSessions.id,
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
            eq(lessonSessions.id, input.session_id),
            eq(lessonSessions.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Verify ownership
      const sessionTeacherId = session.sessionTeacherId ?? session.slotTeacherId;
      if (sessionTeacherId !== teacher.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This session is not assigned to you",
        });
      }

      // Time window restriction removed per user request: allow check-in at any time
      // Teachers might need to take attendance late or at the end of the lesson
      const now = new Date();

      // Update session status to ongoing and set checkin_at
      await db
        .update(lessonSessions)
        .set({
          status: "ongoing",
          checkinAt: now,
          updatedAt: now,
        })
        .where(eq(lessonSessions.id, input.session_id));

      return { success: true };
    }),

  checkOut: schoolProcedure
    .input(z.object({ session_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Fetch teacher record linked to authenticated user
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(
          and(
            eq(teachers.userId, ctx.userId),
            eq(teachers.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!teacher) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Teacher profile not found",
        });
      }

      // Fetch session and schedule slot
      const [session] = await db
        .select({
          id: lessonSessions.id,
          status: lessonSessions.status,
          checkinAt: lessonSessions.checkinAt,
          slotTeacherId: scheduleSlots.teacherId,
          sessionTeacherId: lessonSessions.teacherId,
          sessionDate: lessonSessions.sessionDate,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .where(
          and(
            eq(lessonSessions.id, input.session_id),
            eq(lessonSessions.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Verify ownership
      const sessionTeacherId = session.sessionTeacherId ?? session.slotTeacherId;
      if (sessionTeacherId !== teacher.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This session is not assigned to you",
        });
      }

      // Verify that check-in was completed
      if (!session.checkinAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot check out without checking in first",
        });
      }

      const now = new Date();

      // Update session status to completed and set checkout_at
      await db
        .update(lessonSessions)
        .set({
          status: "completed",
          checkoutAt: now,
          updatedAt: now,
        })
        .where(eq(lessonSessions.id, input.session_id));

      // Calculate duration in hours
      const durationHours = (now.getTime() - new Date(session.checkinAt).getTime()) / (1000 * 60 * 60);
      const roundedHours = Math.round((durationHours + Number.EPSILON) * 100) / 100;

      // Auto-create pending hour log
      const auditTrail = [
        {
          action: "created",
          by: ctx.userId,
          at: now.toISOString(),
        },
      ];

      await db.insert(hourLogs).values({
        schoolId: ctx.schoolId,
        teacherId: teacher.id,
        lessonSessionId: session.id,
        hours: String(roundedHours),
        status: "pending",
        notes: `Automatic check-out log for session on ${session.sessionDate}`,
        auditTrail: auditTrail,
        logDate: session.sessionDate,
        classType: "group",
      });

      return { success: true, hours: roundedHours };
    }),
});

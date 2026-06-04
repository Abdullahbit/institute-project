import { alertSchema, listAlertsInputSchema } from "@institute/types";
import { z } from "zod";
import { mockAlerts } from "../lib/mock-data.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { hasSupabase } from "../lib/env.js";
import { router, schoolProcedure } from "../trpc/trpc.js";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { alerts, profiles, substituteRequests, lessonSessions, scheduleSlots, classes, teachers } from "@workspace/db/schema";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export const alertsRouter = router({
  list: schoolProcedure
    .input(listAlertsInputSchema.optional())
    .output(z.array(alertSchema))
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;
      const supabase = getSupabaseAdmin();

      if (!hasSupabase() || !supabase) {
        let rows = mockAlerts.filter((a) => a.school_id === ctx.schoolId);
        if (input?.resolved !== undefined) {
          rows = rows.filter((a) => a.is_resolved === input.resolved);
        }
        return z.array(alertSchema).parse(rows.slice(0, limit));
      }

      let query = supabase
        .from("alerts")
        .select("*, teachers(full_name)")
        .eq("school_id", ctx.schoolId)
        .eq("is_active", true)
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (input?.resolved !== undefined) {
        query = query.eq("is_resolved", input.resolved);
      }

      const { data, error } = await query;
      if (error) throw error;

      return z.array(alertSchema).parse(
        (data ?? []).map((row) => ({
          id: row.id,
          school_id: row.school_id,
          type: row.type,
          teacher_id: row.teacher_id,
          teacher_name:
            (row.teachers as { full_name: string } | null)?.full_name ?? null,
          title: row.title,
          description: row.description,
          occurred_at: row.occurred_at ? new Date(row.occurred_at).toISOString() : new Date().toISOString(),
          is_resolved: row.is_resolved,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        })),
      );
    }),

  getActiveAlerts: schoolProcedure
    .query(async ({ ctx }) => {
      const rows = await db
        .select({
          id: alerts.id,
          schoolId: alerts.schoolId,
          type: alerts.type,
          teacherId: alerts.teacherId,
          teacherName: teachers.fullName,
          title: alerts.title,
          description: alerts.description,
          occurredAt: alerts.occurredAt,
          isResolved: alerts.isResolved,
          createdAt: alerts.createdAt,
        })
        .from(alerts)
        .leftJoin(teachers, eq(alerts.teacherId, teachers.id))
        .where(
          and(
            eq(alerts.schoolId, ctx.schoolId),
            eq(alerts.isResolved, false),
            eq(alerts.isActive, true)
          )
        )
        .orderBy(desc(alerts.occurredAt));

      return rows.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        type: r.type as any,
        teacher_id: r.teacherId,
        teacher_name: r.teacherName,
        title: r.title,
        description: r.description,
        occurred_at: r.occurredAt.toISOString(),
        is_resolved: r.isResolved,
        created_at: r.createdAt.toISOString(),
      }));
    }),

  resolveAlert: schoolProcedure
    .input(z.object({ alert_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin role check
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin role required to resolve alerts",
        });
      }

      await db
        .update(alerts)
        .set({
          isResolved: true,
          resolvedBy: ctx.userId,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(alerts.id, input.alert_id));

      return { success: true };
    }),

  createSubstituteRequest: schoolProcedure
    .input(z.object({ session_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin role required to create substitute requests",
        });
      }

      // Fetch session to determine requesting teacher
      const [session] = await db
        .select({
          id: lessonSessions.id,
          schoolId: lessonSessions.schoolId,
          slotTeacherId: scheduleSlots.teacherId,
          sessionTeacherId: lessonSessions.teacherId,
          sessionDate: lessonSessions.sessionDate,
          startTime: scheduleSlots.startTime,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .where(eq(lessonSessions.id, input.session_id))
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const requestingTeacherId = session.sessionTeacherId ?? session.slotTeacherId;

      const [inserted] = await db
        .insert(substituteRequests)
        .values({
          schoolId: ctx.schoolId,
          lessonSessionId: session.id,
          requestingTeacherId,
          status: "pending",
        })
        .returning();

      // Trigger realtime broadcast
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.channel("alerts").send({
          type: "broadcast",
          event: "substitute_request_created",
          payload: { requestId: inserted.id, sessionId: session.id },
        });
      }

      // Query teacher expo push tokens
      const targetTeachers = await db
        .select({ expoPushToken: profiles.expoPushToken })
        .from(profiles)
        .where(
          and(
            eq(profiles.schoolId, ctx.schoolId),
            eq(profiles.role, "teacher"),
            isNotNull(profiles.expoPushToken)
          )
        );

      const tokens = targetTeachers.map((t) => t.expoPushToken).filter(Boolean);
      if (tokens.length > 0) {
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify(
              tokens.map((token) => ({
                to: token,
                sound: "default",
                title: "Vekil Öğretmen Talebi",
                body: `${session.sessionDate} tarihindeki ders için vekil öğretmen aranıyor.`,
                data: { requestId: inserted.id, sessionId: session.id },
              })),
            ),
          });
        } catch (e) {
          logger.error(e, "Failed to send Expo push notifications");
        }
      }

      return { success: true, requestId: inserted.id };
    }),

  getOpenSubstituteRequests: schoolProcedure
    .query(async ({ ctx }) => {
      const openRequests = await db
        .select({
          id: substituteRequests.id,
          schoolId: substituteRequests.schoolId,
          lessonSessionId: substituteRequests.lessonSessionId,
          requestingTeacherId: substituteRequests.requestingTeacherId,
          requestingTeacherName: teachers.fullName,
          status: substituteRequests.status,
          createdAt: substituteRequests.createdAt,
          sessionDate: lessonSessions.sessionDate,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          className: classes.name,
        })
        .from(substituteRequests)
        .innerJoin(lessonSessions, eq(substituteRequests.lessonSessionId, lessonSessions.id))
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .innerJoin(teachers, eq(substituteRequests.requestingTeacherId, teachers.id))
        .where(
          and(
            eq(substituteRequests.schoolId, ctx.schoolId),
            eq(substituteRequests.status, "pending")
          )
        );

      return openRequests.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        lesson_session_id: r.lessonSessionId,
        requesting_teacher_id: r.requestingTeacherId,
        requesting_teacher_name: r.requestingTeacherName,
        status: r.status,
        created_at: r.createdAt.toISOString(),
        session_date: r.sessionDate,
        time_label: `${String(r.startTime).slice(0, 5)} - ${String(r.endTime).slice(0, 5)}`,
        class_name: r.className,
      }));
    }),

  respondToSubstituteRequest: schoolProcedure
    .input(z.object({
      request_id: z.string().uuid(),
      response: z.enum(["accepted", "declined"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Fetch teacher responding
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

      // Fetch request
      const [request] = await db
        .select()
        .from(substituteRequests)
        .where(eq(substituteRequests.id, input.request_id))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Substitute request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request is no longer pending",
        });
      }

      const now = new Date();

      if (input.response === "accepted") {
        // Update substitute request
        await db
          .update(substituteRequests)
          .set({
            status: "accepted",
            coveringTeacherId: teacher.id,
            updatedAt: now,
          })
          .where(eq(substituteRequests.id, input.request_id));

        // Reassign lesson_sessions teacher
        await db
          .update(lessonSessions)
          .set({
            teacherId: teacher.id,
            updatedAt: now,
          })
          .where(eq(lessonSessions.id, request.lessonSessionId));
      } else {
        // Update request to declined
        await db
          .update(substituteRequests)
          .set({
            status: "declined",
            updatedAt: now,
          })
          .where(eq(substituteRequests.id, input.request_id));
      }

      // Broadcast realtime WebSocket alert to admin
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.channel("alerts").send({
          type: "broadcast",
          event: "substitute_request_resolved",
          payload: {
            requestId: request.id,
            status: input.response,
            coveringTeacherId: teacher.id,
          },
        });
      }

      return { success: true };
    }),

  registerPushToken: schoolProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      await db
        .update(profiles)
        .set({
          expoPushToken: input.token,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, ctx.userId));

      return { success: true };
    }),
});

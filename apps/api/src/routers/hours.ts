import { router, schoolProcedure } from "../trpc/trpc.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { hourLogs, teachers, profiles } from "@workspace/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { createManualHourLogInputSchema } from "@institute/types";

export const hoursRouter = router({
  getMyHourLogs: schoolProcedure
    .input(
      z.object({
        month: z.string().optional(), // Format: YYYY-MM
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Find teacher linked to authenticated user
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

      const conditions = [
        eq(hourLogs.teacherId, teacher.id),
        eq(hourLogs.schoolId, ctx.schoolId),
        eq(hourLogs.isActive, true),
      ];

      if (input?.status) {
        conditions.push(eq(hourLogs.status, input.status));
      }

      if (input?.month) {
        conditions.push(like(hourLogs.logDate, `${input.month}-%`));
      }

      const logs = await db
        .select()
        .from(hourLogs)
        .where(and(...conditions))
        .orderBy(desc(hourLogs.loggedAt));

      return logs.map((row) => ({
        id: row.id,
        school_id: row.schoolId,
        teacher_id: row.teacherId,
        lesson_session_id: row.lessonSessionId,
        hours: Number(row.hours),
        status: row.status as any,
        notes: row.notes,
        class_type: row.classType as any,
        log_date: row.logDate,
        logged_at: row.loggedAt.toISOString(),
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
        audit_trail: row.auditTrail as any[],
      }));
    }),

  createManualHourLog: schoolProcedure
    .input(createManualHourLogInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Find teacher linked to authenticated user
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

      const hoursValue = input.duration_minutes / 60;
      const roundedHours = Math.round((hoursValue + Number.EPSILON) * 100) / 100;
      const now = new Date();

      // Initial audit trail
      const auditTrail = [
        {
          action: "created",
          by: ctx.userId,
          at: now.toISOString(),
        },
      ];

      const [inserted] = await db
        .insert(hourLogs)
        .values({
          schoolId: ctx.schoolId,
          teacherId: teacher.id,
          hours: String(roundedHours),
          status: "pending",
          notes: input.notes,
          logDate: input.log_date,
          classType: input.class_type,
          auditTrail: auditTrail,
          loggedAt: now,
        })
        .returning();

      return {
        success: true,
        logId: inserted.id,
        hours: roundedHours,
      };
    }),

  updateHourLog: schoolProcedure
    .input(
      z.object({
        log_id: z.string().uuid(),
        data: createManualHourLogInputSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Find teacher linked to authenticated user
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

      // Fetch existing log
      const [existingLog] = await db
        .select()
        .from(hourLogs)
        .where(
          and(
            eq(hourLogs.id, input.log_id),
            eq(hourLogs.schoolId, ctx.schoolId),
            eq(hourLogs.isActive, true)
          )
        )
        .limit(1);

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hour log not found",
        });
      }

      // Validate: teacher can only edit their own pending logs
      if (existingLog.teacherId !== teacher.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own hour logs",
        });
      }

      if (existingLog.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending hour logs can be modified",
        });
      }

      const now = new Date();
      const changes: Record<string, [any, any]> = {};
      const updateData: Record<string, any> = { updatedAt: now };

      if (input.data.notes !== undefined && input.data.notes !== existingLog.notes) {
        changes.notes = [existingLog.notes, input.data.notes];
        updateData.notes = input.data.notes;
      }

      if (input.data.class_type !== undefined && input.data.class_type !== existingLog.classType) {
        changes.classType = [existingLog.classType, input.data.class_type];
        updateData.classType = input.data.class_type;
      }

      if (input.data.log_date !== undefined && input.data.log_date !== existingLog.logDate) {
        changes.logDate = [existingLog.logDate, input.data.log_date];
        updateData.logDate = input.data.log_date;
      }

      if (input.data.duration_minutes !== undefined) {
        const newHours = input.data.duration_minutes / 60;
        const roundedNewHours = Math.round((newHours + Number.EPSILON) * 100) / 100;
        const oldHours = Number(existingLog.hours);
        if (roundedNewHours !== oldHours) {
          changes.hours = [oldHours, roundedNewHours];
          updateData.hours = String(roundedNewHours);
        }
      }

      // If changes occurred, update audit_trail and database
      if (Object.keys(changes).length > 0) {
        const auditEntry = {
          action: "updated",
          by: ctx.userId,
          at: now.toISOString(),
          changes,
        };
        const updatedAuditTrail = [...(existingLog.auditTrail as any[]), auditEntry];
        updateData.auditTrail = updatedAuditTrail;

        await db
          .update(hourLogs)
          .set(updateData)
          .where(eq(hourLogs.id, input.log_id));
      }

      return { success: true };
    }),

  reviewHourLog: schoolProcedure
    .input(
      z.object({
        log_id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
      })
    )
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
          message: "Admin role required to review hour logs",
        });
      }

      // Fetch existing log
      const [existingLog] = await db
        .select()
        .from(hourLogs)
        .where(
          and(
            eq(hourLogs.id, input.log_id),
            eq(hourLogs.schoolId, ctx.schoolId),
            eq(hourLogs.isActive, true)
          )
        )
        .limit(1);

      if (!existingLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hour log not found",
        });
      }

      const now = new Date();

      const auditEntry = {
        action: input.decision,
        by: ctx.userId,
        at: now.toISOString(),
        note: input.note || null,
      };

      const updatedAuditTrail = [...(existingLog.auditTrail as any[]), auditEntry];

      await db
        .update(hourLogs)
        .set({
          status: input.decision,
          auditTrail: updatedAuditTrail,
          updatedAt: now,
        })
        .where(eq(hourLogs.id, input.log_id));

      return { success: true };
    }),

  getHourLogSummary: schoolProcedure
    .input(
      z.object({
        teacher_id: z.string().uuid(),
        month: z.string(), // Format: YYYY-MM
      })
    )
    .query(async ({ ctx, input }) => {
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
          message: "Admin role required to view hour log summaries",
        });
      }

      const logs = await db
        .select()
        .from(hourLogs)
        .where(
          and(
            eq(hourLogs.teacherId, input.teacher_id),
            eq(hourLogs.schoolId, ctx.schoolId),
            eq(hourLogs.isActive, true),
            like(hourLogs.logDate, `${input.month}-%`)
          )
        )
        .orderBy(desc(hourLogs.loggedAt));

      let totalApproved = 0;
      let totalPending = 0;
      let groupHours = 0;
      let privateHours = 0;
      let onlineHours = 0;

      for (const log of logs) {
        const h = Number(log.hours);
        if (log.status === "approved") {
          totalApproved += h;
          if (log.classType === "group") {
            groupHours += h;
          } else if (log.classType === "private") {
            privateHours += h;
          } else if (log.classType === "online") {
            onlineHours += h;
          }
        } else if (log.status === "pending") {
          totalPending += h;
        }
      }

      return {
        logs: logs.map((row) => ({
          id: row.id,
          school_id: row.schoolId,
          teacher_id: row.teacherId,
          lesson_session_id: row.lessonSessionId,
          hours: Number(row.hours),
          status: row.status as any,
          notes: row.notes,
          class_type: row.classType as any,
          log_date: row.logDate,
          logged_at: row.loggedAt.toISOString(),
          created_at: row.createdAt.toISOString(),
          updated_at: row.updatedAt.toISOString(),
          audit_trail: row.auditTrail as any[],
        })),
        summary: {
          total_approved: totalApproved,
          total_pending: totalPending,
          breakdown: {
            group: groupHours,
            private: privateHours,
            online: onlineHours,
          },
        },
      };
    }),
});

import { router, schoolProcedure } from "../trpc/trpc.js";
import { logAttendanceInputSchema, submitProgressReportInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { studentLogs, progressReports, lessonSessions, students, profiles } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const studentsRouter = router({
  list: schoolProcedure
    .query(async ({ ctx }) => {
      const rows = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, ctx.schoolId),
            eq(students.isActive, true)
          )
        )
        .orderBy(students.fullName);

      return rows.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        user_id: r.userId,
        full_name: r.fullName,
        is_active: r.isActive,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }));
    }),

  create: schoolProcedure
    .input(
      z.object({
        full_name: z.string().min(1),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create student profiles",
        });
      }

      let userId: string | null = null;
      if (input.email && ctx.supabase) {
        try {
          const { data: listData } = await ctx.supabase.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u: any) => u.email === input.email);
          if (existingUser) {
            userId = existingUser.id;
          } else if (input.password) {
            const { data: createData, error: createError } = await ctx.supabase.auth.admin.createUser({
              email: input.email,
              password: input.password,
              user_metadata: {
                school_id: ctx.schoolId,
                role: "student",
                full_name: input.full_name,
              },
              email_confirm: true,
            });
            if (createError) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Failed to create auth account: ${createError.message}`,
              });
            }
            if (createData.user) {
              userId = createData.user.id;
              
              // Sync in profiles table
              await db.insert(profiles).values({
                id: userId,
                schoolId: ctx.schoolId,
                role: "student",
                fullName: input.full_name,
                isActive: true,
              });
            }
          }
        } catch (e: any) {
          console.error("Failed to lookup/create student in auth:", e);
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: e?.message || "Failed to create student credentials",
          });
        }
      }

      const [inserted] = await db
        .insert(students)
        .values({
          schoolId: ctx.schoolId,
          fullName: input.full_name,
          userId,
          isActive: true,
        })
        .returning();

      return {
        success: true,
        studentId: inserted.id,
        user_id: inserted.userId,
      };
    }),

  logAttendance: schoolProcedure
    .input(logAttendanceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // 1. Verify session exists in school
      const [session] = await db
        .select()
        .from(lessonSessions)
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

      // 2. Perform bulk insert for roster
      const values = input.roster.map((row) => ({
        schoolId: ctx.schoolId,
        lessonSessionId: input.session_id,
        studentId: row.student_id,
        status: row.status,
        notes: row.notes || null,
      }));

      if (values.length > 0) {
        await db.insert(studentLogs).values(values);
      }

      // 3. Calculate count of students marked present/late
      const presentCount = input.roster.filter((r) => r.status === "present" || r.status === "late").length;

      // 4. Update studentCount in lessonSessions
      await db
        .update(lessonSessions)
        .set({
          studentCount: presentCount,
          updatedAt: new Date(),
        })
        .where(eq(lessonSessions.id, input.session_id));

      return { success: true, presentCount };
    }),

  submitProgressReport: schoolProcedure
    .input(submitProgressReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const [inserted] = await db
        .insert(progressReports)
        .values({
          schoolId: ctx.schoolId,
          studentId: input.student_id,
          teacherId: input.teacher_id,
          levelCode: input.level_code,
          scoreListening: input.score_listening,
          scoreSpeaking: input.score_speaking,
          scoreOverall: input.score_overall,
          notes: input.notes || null,
        })
        .returning();

      return { success: true, reportId: inserted.id };
    }),

  getStudentReportCards: schoolProcedure
    .input(z.object({ student_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(progressReports)
        .where(
          and(
            eq(progressReports.studentId, input.student_id),
            eq(progressReports.schoolId, ctx.schoolId),
            eq(progressReports.isActive, true)
          )
        )
        .orderBy(desc(progressReports.createdAt));

      return rows.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        student_id: r.studentId,
        teacher_id: r.teacherId,
        level_code: r.levelCode,
        score_listening: r.scoreListening,
        score_speaking: r.scoreSpeaking,
        score_overall: r.scoreOverall,
        notes: r.notes,
        report_date: r.reportDate,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }));
    }),
});

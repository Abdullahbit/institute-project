import { router, schoolProcedure } from "../trpc/trpc.js";
import { logAttendanceInputSchema, submitProgressReportInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { studentLogs, progressReports, lessonSessions } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const studentsRouter = router({
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

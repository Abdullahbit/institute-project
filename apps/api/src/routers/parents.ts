import { router, schoolProcedure } from "../trpc/trpc.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import {
  parents,
  parentStudents,
  students,
  profiles,
  behaviorFeedbacks,
  studentLogs,
  progressReports,
  lessonSessions,
  scheduleSlots,
  classEnrollments,
  classes,
  teachers,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  createParentInputSchema,
  updateParentInputSchema,
  linkParentStudentInputSchema,
  submitBehaviorFeedbackInputSchema,
} from "@institute/types";

export const parentsRouter = router({
  // ─── Parent-facing endpoints ───

  /** Get the parent's linked children */
  getMyChildren: schoolProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    // Find parent record for authenticated user
    const [parent] = await db
      .select()
      .from(parents)
      .where(
        and(
          eq(parents.userId, ctx.userId),
          eq(parents.schoolId, ctx.schoolId),
          eq(parents.isActive, true)
        )
      )
      .limit(1);

    if (!parent) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Veli profili bulunamadı" });
    }

    // Get linked students
    const links = await db
      .select({
        linkId: parentStudents.id,
        relationship: parentStudents.relationship,
        studentId: students.id,
        studentName: students.fullName,
        classId: classes.id,
        className: classes.name,
      })
      .from(parentStudents)
      .innerJoin(students, eq(parentStudents.studentId, students.id))
      .leftJoin(
        classEnrollments,
        and(eq(students.id, classEnrollments.studentId), eq(classEnrollments.isActive, true))
      )
      .leftJoin(classes, eq(classEnrollments.classId, classes.id))
      .where(
        and(eq(parentStudents.parentId, parent.id), eq(parentStudents.isActive, true))
      );

    return links.map((l) => ({
      student_id: l.studentId,
      student_name: l.studentName,
      relationship: l.relationship,
      class_id: l.classId,
      class_name: l.className,
    }));
  }),

  /** Get dashboard summary for a specific child */
  getChildDashboard: schoolProcedure
    .input(z.object({ student_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      // Verify parent owns this student
      await verifyParentAccess(ctx.userId, ctx.schoolId, input.student_id);

      // 1. Get student info
      const [student] = await db
        .select({
          id: students.id,
          fullName: students.fullName,
          classId: classes.id,
          className: classes.name,
          levelCode: classes.levelCode,
        })
        .from(students)
        .leftJoin(
          classEnrollments,
          and(eq(students.id, classEnrollments.studentId), eq(classEnrollments.isActive, true))
        )
        .leftJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(eq(students.id, input.student_id))
        .limit(1);

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Öğrenci bulunamadı" });
      }

      // 2. Get attendance stats for this month
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const attendanceLogs = await db
        .select({
          status: studentLogs.status,
        })
        .from(studentLogs)
        .innerJoin(lessonSessions, eq(studentLogs.lessonSessionId, lessonSessions.id))
        .where(
          and(
            eq(studentLogs.studentId, input.student_id),
            eq(studentLogs.schoolId, ctx.schoolId),
            eq(studentLogs.isActive, true),
            sql`to_char(${lessonSessions.sessionDate}, 'YYYY-MM') = ${monthStr}`
          )
        );

      const totalLogs = attendanceLogs.length;
      const presentCount = attendanceLogs.filter((a) => a.status === "present").length;
      const lateCount = attendanceLogs.filter((a) => a.status === "late").length;
      const absentCount = attendanceLogs.filter((a) => a.status === "absent").length;
      const attendanceRate = totalLogs > 0 ? Math.round(((presentCount + lateCount) / totalLogs) * 100) : 100;

      // 3. Get latest progress report
      const [latestReport] = await db
        .select()
        .from(progressReports)
        .where(
          and(
            eq(progressReports.studentId, input.student_id),
            eq(progressReports.schoolId, ctx.schoolId),
            eq(progressReports.isActive, true)
          )
        )
        .orderBy(desc(progressReports.reportDate))
        .limit(1);

      // 4. Get today's sessions
      const today = now.toISOString().slice(0, 10);
      const dayOfWeek = now.getDay(); // 0=Sunday

      const todaySessions = student.classId
        ? await db
            .select({
              slotId: scheduleSlots.id,
              startTime: scheduleSlots.startTime,
              endTime: scheduleSlots.endTime,
              roomName: scheduleSlots.roomName,
              teacherName: teachers.fullName,
            })
            .from(scheduleSlots)
            .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
            .where(
              and(
                eq(scheduleSlots.classId, student.classId),
                eq(scheduleSlots.dayOfWeek, dayOfWeek),
                eq(scheduleSlots.isActive, true),
                eq(scheduleSlots.schoolId, ctx.schoolId)
              )
            )
            .orderBy(scheduleSlots.startTime)
        : [];

      // 5. Recent behavior feedbacks (last 5)
      const recentFeedbacks = await db
        .select({
          id: behaviorFeedbacks.id,
          category: behaviorFeedbacks.category,
          title: behaviorFeedbacks.title,
          feedbackDate: behaviorFeedbacks.feedbackDate,
          teacherName: teachers.fullName,
        })
        .from(behaviorFeedbacks)
        .innerJoin(teachers, eq(behaviorFeedbacks.teacherId, teachers.id))
        .where(
          and(
            eq(behaviorFeedbacks.studentId, input.student_id),
            eq(behaviorFeedbacks.schoolId, ctx.schoolId),
            eq(behaviorFeedbacks.isActive, true)
          )
        )
        .orderBy(desc(behaviorFeedbacks.createdAt))
        .limit(5);

      return {
        student: {
          id: student.id,
          full_name: student.fullName,
          class_name: student.className,
          level_code: student.levelCode,
        },
        attendance: {
          total: totalLogs,
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          rate: attendanceRate,
          month: monthStr,
        },
        latest_report: latestReport
          ? {
              score_listening: latestReport.scoreListening,
              score_speaking: latestReport.scoreSpeaking,
              score_overall: latestReport.scoreOverall,
              notes: latestReport.notes,
              report_date: latestReport.reportDate,
              level_code: latestReport.levelCode,
            }
          : null,
        today_sessions: todaySessions.map((s) => ({
          start_time: s.startTime,
          end_time: s.endTime,
          room_name: s.roomName,
          teacher_name: s.teacherName,
        })),
        recent_feedbacks: recentFeedbacks.map((f) => ({
          id: f.id,
          category: f.category,
          title: f.title,
          feedback_date: f.feedbackDate,
          teacher_name: f.teacherName,
        })),
      };
    }),

  /** Get child's attendance history */
  getChildAttendance: schoolProcedure
    .input(
      z.object({
        student_id: z.string().uuid(),
        month: z.string().optional(), // YYYY-MM
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }
      await verifyParentAccess(ctx.userId, ctx.schoolId, input.student_id);

      const now = new Date();
      const monthStr =
        input.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const logs = await db
        .select({
          id: studentLogs.id,
          status: studentLogs.status,
          roundNumber: studentLogs.roundNumber,
          notes: studentLogs.notes,
          createdAt: studentLogs.createdAt,
          sessionDate: lessonSessions.sessionDate,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          className: classes.name,
          teacherName: teachers.fullName,
        })
        .from(studentLogs)
        .innerJoin(lessonSessions, eq(studentLogs.lessonSessionId, lessonSessions.id))
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(
          and(
            eq(studentLogs.studentId, input.student_id),
            eq(studentLogs.schoolId, ctx.schoolId),
            eq(studentLogs.isActive, true),
            sql`to_char(${lessonSessions.sessionDate}, 'YYYY-MM') = ${monthStr}`
          )
        )
        .orderBy(desc(lessonSessions.sessionDate));

      return logs.map((l) => ({
        id: l.id,
        status: l.status,
        round_number: l.roundNumber,
        notes: l.notes,
        session_date: l.sessionDate,
        start_time: l.startTime,
        end_time: l.endTime,
        class_name: l.className,
        teacher_name: l.teacherName,
        created_at: l.createdAt.toISOString(),
      }));
    }),

  /** Get child's progress reports */
  getChildProgressReports: schoolProcedure
    .input(z.object({ student_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }
      await verifyParentAccess(ctx.userId, ctx.schoolId, input.student_id);

      const reports = await db
        .select({
          id: progressReports.id,
          levelCode: progressReports.levelCode,
          scoreListening: progressReports.scoreListening,
          scoreSpeaking: progressReports.scoreSpeaking,
          scoreOverall: progressReports.scoreOverall,
          notes: progressReports.notes,
          reportDate: progressReports.reportDate,
          teacherName: teachers.fullName,
        })
        .from(progressReports)
        .innerJoin(teachers, eq(progressReports.teacherId, teachers.id))
        .where(
          and(
            eq(progressReports.studentId, input.student_id),
            eq(progressReports.schoolId, ctx.schoolId),
            eq(progressReports.isActive, true)
          )
        )
        .orderBy(desc(progressReports.reportDate));

      return reports.map((r) => ({
        id: r.id,
        level_code: r.levelCode,
        score_listening: r.scoreListening,
        score_speaking: r.scoreSpeaking,
        score_overall: r.scoreOverall,
        notes: r.notes,
        report_date: r.reportDate,
        teacher_name: r.teacherName,
      }));
    }),

  /** Get child's weekly schedule */
  getChildSchedule: schoolProcedure
    .input(z.object({ student_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }
      await verifyParentAccess(ctx.userId, ctx.schoolId, input.student_id);

      // Find student's class
      const [enrollment] = await db
        .select({ classId: classEnrollments.classId })
        .from(classEnrollments)
        .where(
          and(
            eq(classEnrollments.studentId, input.student_id),
            eq(classEnrollments.isActive, true)
          )
        )
        .limit(1);

      if (!enrollment) {
        return [];
      }

      const slots = await db
        .select({
          id: scheduleSlots.id,
          dayOfWeek: scheduleSlots.dayOfWeek,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          roomName: scheduleSlots.roomName,
          className: classes.name,
          teacherName: teachers.fullName,
          teacherBranch: teachers.branch,
        })
        .from(scheduleSlots)
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(
          and(
            eq(scheduleSlots.classId, enrollment.classId),
            eq(scheduleSlots.isActive, true),
            eq(scheduleSlots.schoolId, ctx.schoolId)
          )
        )
        .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime);

      return slots.map((s) => ({
        id: s.id,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        room_name: s.roomName,
        class_name: s.className,
        teacher_name: s.teacherName,
        teacher_branch: s.teacherBranch,
      }));
    }),

  /** Get behavior feedbacks for a child */
  getChildBehaviorFeedbacks: schoolProcedure
    .input(
      z.object({
        student_id: z.string().uuid(),
        category: z.enum(["excellent", "good", "warning", "issue"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }
      await verifyParentAccess(ctx.userId, ctx.schoolId, input.student_id);

      const conditions = [
        eq(behaviorFeedbacks.studentId, input.student_id),
        eq(behaviorFeedbacks.schoolId, ctx.schoolId),
        eq(behaviorFeedbacks.isActive, true),
      ];

      if (input.category) {
        conditions.push(eq(behaviorFeedbacks.category, input.category));
      }

      const feedbacks = await db
        .select({
          id: behaviorFeedbacks.id,
          category: behaviorFeedbacks.category,
          title: behaviorFeedbacks.title,
          description: behaviorFeedbacks.description,
          feedbackDate: behaviorFeedbacks.feedbackDate,
          createdAt: behaviorFeedbacks.createdAt,
          teacherName: teachers.fullName,
        })
        .from(behaviorFeedbacks)
        .innerJoin(teachers, eq(behaviorFeedbacks.teacherId, teachers.id))
        .where(and(...conditions))
        .orderBy(desc(behaviorFeedbacks.createdAt));

      return feedbacks.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        description: f.description,
        feedback_date: f.feedbackDate,
        teacher_name: f.teacherName,
        created_at: f.createdAt.toISOString(),
      }));
    }),

  // ─── Teacher endpoint ───

  /** Teacher submits a behavior feedback for a student */
  submitBehaviorFeedback: schoolProcedure
    .input(submitBehaviorFeedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      // Find teacher
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(
          and(
            eq(teachers.userId, ctx.userId),
            eq(teachers.schoolId, ctx.schoolId),
            eq(teachers.isActive, true)
          )
        )
        .limit(1);

      if (!teacher) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Öğretmen profili bulunamadı" });
      }

      const [feedback] = await db
        .insert(behaviorFeedbacks)
        .values({
          schoolId: ctx.schoolId,
          studentId: input.student_id,
          teacherId: teacher.id,
          lessonSessionId: input.lesson_session_id || null,
          category: input.category,
          title: input.title,
          description: input.description || null,
        })
        .returning();

      return { success: true, id: feedback.id };
    }),

  // ─── Admin endpoints ───

  /** Admin: list all parents */
  listParents: schoolProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ctx.userId))
      .limit(1);

    if (!profile || profile.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin yetkisi gerekli" });
    }

    const parentRows = await db
      .select()
      .from(parents)
      .where(
        and(eq(parents.schoolId, ctx.schoolId), eq(parents.isActive, true))
      )
      .orderBy(parents.fullName);

    // Get linked students for each parent
    const result = [];
    for (const p of parentRows) {
      const linked = await db
        .select({
          studentId: students.id,
          studentName: students.fullName,
          relationship: parentStudents.relationship,
        })
        .from(parentStudents)
        .innerJoin(students, eq(parentStudents.studentId, students.id))
        .where(
          and(eq(parentStudents.parentId, p.id), eq(parentStudents.isActive, true))
        );

      result.push({
        id: p.id,
        school_id: p.schoolId,
        user_id: p.userId,
        full_name: p.fullName,
        email: p.email,
        password: p.password,
        phone: p.phone,
        is_active: p.isActive,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
        children: linked.map((l) => ({
          student_id: l.studentId,
          student_name: l.studentName,
          relationship: l.relationship,
        })),
      });
    }

    return result;
  }),

  /** Admin: create a parent and link to students */
  createParent: schoolProcedure
    .input(createParentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin yetkisi gerekli" });
      }

      // 1. Create Supabase auth user for parent
      let authUserId: string | null = null;
      if (ctx.supabase) {
        try {
          const { data: authUser, error: authError } =
            await ctx.supabase.auth.admin.createUser({
              email: input.email,
              password: input.password,
              email_confirm: true,
              user_metadata: {
                full_name: input.full_name,
                role: "parent",
                school_id: ctx.schoolId,
              },
            });

          if (authError) throw authError;
          authUserId = authUser.user.id;

          // Create profile
          await db.insert(profiles).values({
            id: authUserId,
            schoolId: ctx.schoolId,
            role: "parent",
            fullName: input.full_name,
          });
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Auth hatası: ${err.message}`,
          });
        }
      }

      // 2. Create parent record
      const [parent] = await db
        .insert(parents)
        .values({
          schoolId: ctx.schoolId,
          userId: authUserId,
          fullName: input.full_name,
          email: input.email,
          password: input.password,
          phone: input.phone || null,
        })
        .returning();

      // 3. Link to students
      for (const studentId of input.student_ids) {
        await db.insert(parentStudents).values({
          parentId: parent.id,
          studentId,
        });
      }

      return { success: true, id: parent.id };
    }),

  /** Admin: link an existing parent to an additional student */
  linkParentToStudent: schoolProcedure
    .input(linkParentStudentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin yetkisi gerekli" });
      }

      await db.insert(parentStudents).values({
        parentId: input.parent_id,
        studentId: input.student_id,
        relationship: input.relationship,
      });

      return { success: true };
    }),

  /** Admin: update parent details */
  updateParent: schoolProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        ...updateParentInputSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin yetkisi gerekli" });
      }

      const { id, ...updates } = input;
      const setObj: any = { updatedAt: new Date() };
      if (updates.full_name) setObj.fullName = updates.full_name;
      if (updates.email) setObj.email = updates.email;
      if (updates.phone !== undefined) setObj.phone = updates.phone;
      if (updates.is_active !== undefined) setObj.isActive = updates.is_active;

      await db.update(parents).set(setObj).where(eq(parents.id, id));

      return { success: true };
    }),

  /** Admin: delete (soft) a parent */
  deleteParent: schoolProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!profile || profile.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin yetkisi gerekli" });
      }

      await db
        .update(parents)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(parents.id, input.id));

      return { success: true };
    }),
});

// ─── Helper: verify parent has access to this student ───
async function verifyParentAccess(
  userId: string,
  schoolId: string,
  studentId: string
) {
  const [parent] = await db
    .select({ id: parents.id })
    .from(parents)
    .where(
      and(
        eq(parents.userId, userId),
        eq(parents.schoolId, schoolId),
        eq(parents.isActive, true)
      )
    )
    .limit(1);

  if (!parent) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Veli profili bulunamadı" });
  }

  const [link] = await db
    .select({ id: parentStudents.id })
    .from(parentStudents)
    .where(
      and(
        eq(parentStudents.parentId, parent.id),
        eq(parentStudents.studentId, studentId),
        eq(parentStudents.isActive, true)
      )
    )
    .limit(1);

  if (!link) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bu öğrenciye erişim yetkiniz bulunmamaktadır",
    });
  }

  return parent;
}

import { router, schoolProcedure, subscribedProcedure } from "../trpc/trpc.js";
import { logAttendanceInputSchema, submitProgressReportInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { studentLogs, progressReports, lessonSessions, students, profiles, classEnrollments, classes, scheduleSlots, teachers } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const studentsRouter = router({
  list: schoolProcedure
    .query(async ({ ctx }) => {
      const rows = await db
        .select({
          id: students.id,
          schoolId: students.schoolId,
          userId: students.userId,
          fullName: students.fullName,
          password: students.password,
          parentPhone: students.parentPhone,
          isActive: students.isActive,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt,
          classId: classes.id,
          className: classes.name,
        })
        .from(students)
        .leftJoin(classEnrollments, and(eq(students.id, classEnrollments.studentId), eq(classEnrollments.isActive, true)))
        .leftJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(
          and(
            eq(students.schoolId, ctx.schoolId),
            eq(students.isActive, true)
          )
        )
        .orderBy(students.fullName);

      // Fetch emails from Supabase auth if client is available
      const userEmailsMap = new Map<string, string>();
      if (ctx.supabase) {
        try {
          const { data } = await ctx.supabase.auth.admin.listUsers();
          if (data?.users) {
            for (const u of data.users) {
              if (u.id && u.email) {
                userEmailsMap.set(u.id, u.email);
              }
            }
          }
        } catch (e) {
          console.error("Failed to list auth users for student emails:", e);
        }
      }

      return rows.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        user_id: r.userId,
        full_name: r.fullName,
        email: r.userId ? userEmailsMap.get(r.userId) || "E-posta bulunamadı" : "Bağlantısız Hesap",
        password: r.password || null,
        parent_phone: r.parentPhone,
        is_active: r.isActive,
        class_id: r.classId,
        class_name: r.className,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }));
    }),

  create: subscribedProcedure
    .input(
      z.object({
        full_name: z.string().min(1),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        parent_phone: z.string().optional(),
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
          parentPhone: input.parent_phone || null,
          userId,
          password: input.password || null,
          isActive: true,
        })
        .returning();

      return {
        success: true,
        studentId: inserted.id,
        user_id: inserted.userId,
      };
    }),

  bulkCreate: subscribedProcedure
    .input(
      z.object({
        students: z.array(
          z.object({
            full_name: z.string().min(1),
            email: z.string().email().optional(),
            password: z.string().min(6).optional(),
            parent_phone: z.string().optional(),
          })
        ),
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

      const recordsToInsert = [];

      for (const item of input.students) {
        let userId: string | null = null;
        if (item.email && ctx.supabase) {
          try {
            const { data: listData } = await ctx.supabase.auth.admin.listUsers();
            const existingUser = listData?.users?.find((u: any) => u.email === item.email);
            if (existingUser) {
              userId = existingUser.id;
            } else if (item.password) {
              const { data: createData, error: createError } = await ctx.supabase.auth.admin.createUser({
                email: item.email,
                password: item.password,
                user_metadata: {
                  school_id: ctx.schoolId,
                  role: "student",
                  full_name: item.full_name,
                },
                email_confirm: true,
              });
              if (createError) {
                console.error(`Failed to create auth for ${item.email}: ${createError.message}`);
              } else if (createData.user) {
                userId = createData.user.id;
                
                // Sync in profiles table
                await db.insert(profiles).values({
                  id: userId,
                  schoolId: ctx.schoolId,
                  role: "student",
                  fullName: item.full_name,
                  isActive: true,
                });
              }
            }
          } catch (e: any) {
            console.error("Failed to lookup/create student in auth for bulk:", e);
          }
        }

        recordsToInsert.push({
          schoolId: ctx.schoolId,
          fullName: item.full_name,
          parentPhone: item.parent_phone || null,
          userId,
          password: item.password || null,
          isActive: true,
        });
      }

      if (recordsToInsert.length > 0) {
        const inserted = await db
          .insert(students)
          .values(recordsToInsert)
          .returning();
        return {
          success: true,
          count: inserted.length,
        };
      }

      return {
        success: true,
        count: 0,
      };
    }),

  logAttendance: subscribedProcedure
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

  submitProgressReport: subscribedProcedure
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

  getStudentSchedule: schoolProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const [studentRec] = await db
        .select()
        .from(students)
        .where(and(eq(students.userId, ctx.userId), eq(students.schoolId, ctx.schoolId)))
        .limit(1);

      if (!studentRec) {
        return { class_id: null, class_name: null, slots: [], today_sessions: [] };
      }

      // Get active enrollment
      const [enrollment] = await db
        .select({
          classId: classEnrollments.classId,
          className: classes.name,
        })
        .from(classEnrollments)
        .innerJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(
          and(
            eq(classEnrollments.studentId, studentRec.id),
            eq(classEnrollments.schoolId, ctx.schoolId),
            eq(classEnrollments.isActive, true)
          )
        )
        .limit(1);

      if (!enrollment) {
        return { class_id: null, class_name: null, slots: [], today_sessions: [] };
      }

      // Fetch weekly schedule slots for this class
      const slots = await db
        .select({
          id: scheduleSlots.id,
          roomName: scheduleSlots.roomName,
          dayOfWeek: scheduleSlots.dayOfWeek,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          teacherName: teachers.fullName,
        })
        .from(scheduleSlots)
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(
          and(
            eq(scheduleSlots.classId, enrollment.classId),
            eq(scheduleSlots.isActive, true)
          )
        )
        .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime);

      // Fetch today's sessions for this class
      const todayStr = new Date().toISOString().slice(0, 10);
      const todaySessions = await db
        .select({
          id: lessonSessions.id,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          status: lessonSessions.status,
          teacherName: teachers.fullName,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(
          and(
            eq(scheduleSlots.classId, enrollment.classId),
            eq(lessonSessions.sessionDate, todayStr),
            eq(lessonSessions.isActive, true)
          )
        );

      return {
        class_id: enrollment.classId,
        class_name: enrollment.className,
        slots: slots.map((s) => ({
          id: s.id,
          room_name: s.roomName,
          day_of_week: s.dayOfWeek,
          start_time: String(s.startTime).slice(0, 5),
          end_time: String(s.endTime).slice(0, 5),
          teacher_name: s.teacherName,
        })),
        today_sessions: todaySessions.map((ts) => ({
          id: ts.id,
          time_label: `${String(ts.startTime).slice(0, 5)} - ${String(ts.endTime).slice(0, 5)}`,
          status: ts.status,
          teacher_name: ts.teacherName,
        })),
      };
    }),

  getStudentAttendance: schoolProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const [studentRec] = await db
        .select()
        .from(students)
        .where(and(eq(students.userId, ctx.userId), eq(students.schoolId, ctx.schoolId)))
        .limit(1);

      if (!studentRec) {
        return [];
      }

      // Query student logs joined with lessonSessions and scheduleSlots
      const rows = await db
        .select({
          id: studentLogs.id,
          status: studentLogs.status,
          notes: studentLogs.notes,
          sessionDate: lessonSessions.sessionDate,
          className: classes.name,
        })
        .from(studentLogs)
        .innerJoin(lessonSessions, eq(studentLogs.lessonSessionId, lessonSessions.id))
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .where(
          and(
            eq(studentLogs.studentId, studentRec.id),
            eq(studentLogs.schoolId, ctx.schoolId),
            eq(studentLogs.isActive, true)
          )
        )
        .orderBy(desc(lessonSessions.sessionDate));

      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        notes: r.notes,
        session_date: r.sessionDate,
        class_name: r.className,
      }));
    }),

  getMyReportCards: schoolProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const [studentRec] = await db
        .select()
        .from(students)
        .where(and(eq(students.userId, ctx.userId), eq(students.schoolId, ctx.schoolId)))
        .limit(1);

      if (!studentRec) {
        return [];
      }

      const rows = await db
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
            eq(progressReports.studentId, studentRec.id),
            eq(progressReports.schoolId, ctx.schoolId),
            eq(progressReports.isActive, true)
          )
        )
        .orderBy(desc(progressReports.createdAt));

      return rows.map((r) => ({
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
});

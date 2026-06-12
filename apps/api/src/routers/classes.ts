import { router, schoolProcedure, subscribedProcedure } from "../trpc/trpc.js";
import { 
  createClassInputSchema, 
  updateClassInputSchema, 
  createSlotInputSchema, 
  updateSlotInputSchema,
  enrollStudentInputSchema,
  updateSessionLogInputSchema,
  saveTermReportInputSchema
} from "@institute/types";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { classes, scheduleSlots, profiles, teachers, classEnrollments, students, classrooms, lessonSessions, studentTermReports } from "@workspace/db/schema";
import { eq, and, ne, or, desc, isNull } from "drizzle-orm";

export const classesRouter = router({
  // Class CRUD
  list: schoolProcedure
    .query(async ({ ctx }) => {
      return await db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.schoolId, ctx.schoolId),
            eq(classes.isActive, true)
          )
        )
        .orderBy(classes.name);
    }),

  get: schoolProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [cls] = await db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.id, input.id),
            eq(classes.schoolId, ctx.schoolId),
            eq(classes.isActive, true)
          )
        )
        .limit(1);

      if (!cls) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return cls;
    }),

  create: subscribedProcedure
    .input(createClassInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create classes",
        });
      }

      const [inserted] = await db
        .insert(classes)
        .values({
          schoolId: ctx.schoolId,
          name: input.name,
          levelCode: input.level_code,
          quantity: input.quantity,
          quantityType: input.quantity_type,
          isActive: input.is_active,
        })
        .returning();

      return { success: true, classId: inserted.id };
    }),

  update: subscribedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateClassInputSchema,
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
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can update classes",
        });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.level_code !== undefined) updateData.levelCode = input.data.level_code;
      if (input.data.quantity !== undefined) updateData.quantity = input.data.quantity;
      if (input.data.quantity_type !== undefined) updateData.quantityType = input.data.quantity_type;
      if (input.data.is_active !== undefined) updateData.isActive = input.data.is_active;

      const [updated] = await db
        .update(classes)
        .set(updateData)
        .where(
          and(
            eq(classes.id, input.id),
            eq(classes.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return { success: true };
    }),

  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can delete classes",
        });
      }

      const [deleted] = await db
        .update(classes)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(classes.id, input.id),
            eq(classes.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return { success: true };
    }),

  // Slot CRUD
  listSlots: schoolProcedure
    .input(
      z.object({
        class_id: z.string().uuid().optional(),
        teacher_id: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(scheduleSlots.schoolId, ctx.schoolId),
        eq(scheduleSlots.isActive, true)
      ];

      if (input?.class_id) {
        conditions.push(eq(scheduleSlots.classId, input.class_id));
      }
      if (input?.teacher_id) {
        conditions.push(eq(scheduleSlots.teacherId, input.teacher_id));
      }

      const rows = await db
        .select({
          id: scheduleSlots.id,
          schoolId: scheduleSlots.schoolId,
          classId: scheduleSlots.classId,
          className: classes.name,
          classQuantity: classes.quantity,
          classQuantityType: classes.quantityType,
          classCreatedAt: classes.createdAt,
          teacherId: scheduleSlots.teacherId,
          teacherName: teachers.fullName,
          roomName: scheduleSlots.roomName,
          dayOfWeek: scheduleSlots.dayOfWeek,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          status: scheduleSlots.status,
          isActive: scheduleSlots.isActive,
          cancelledDates: scheduleSlots.cancelledDates,
          createdAt: scheduleSlots.createdAt,
          updatedAt: scheduleSlots.updatedAt,
        })
        .from(scheduleSlots)
        .innerJoin(classes, eq(scheduleSlots.classId, classes.id))
        .innerJoin(teachers, eq(scheduleSlots.teacherId, teachers.id))
        .where(and(...conditions))
        .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime);

      return rows.map((r) => ({
        id: r.id,
        school_id: r.schoolId,
        class_id: r.classId,
        class_name: r.className,
        class_quantity: r.classQuantity,
        class_quantity_type: r.classQuantityType,
        class_created_at: r.classCreatedAt.toISOString(),
        teacher_id: r.teacherId,
        teacher_name: r.teacherName,
        room_name: r.roomName,
        day_of_week: r.dayOfWeek,
        start_time: String(r.startTime).slice(0, 5),
        end_time: String(r.endTime).slice(0, 5),
        status: r.status as any,
        is_active: r.isActive,
        cancelled_dates: r.cancelledDates as string[],
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }));
    }),

  getSlot: schoolProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [slot] = await db
        .select()
        .from(scheduleSlots)
        .where(
          and(
            eq(scheduleSlots.id, input.id),
            eq(scheduleSlots.schoolId, ctx.schoolId),
            eq(scheduleSlots.isActive, true)
          )
        )
        .limit(1);

      if (!slot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule slot not found",
        });
      }

      return {
        id: slot.id,
        school_id: slot.schoolId,
        class_id: slot.classId,
        teacher_id: slot.teacherId,
        room_name: slot.roomName,
        day_of_week: slot.dayOfWeek,
        start_time: String(slot.startTime).slice(0, 5),
        end_time: String(slot.endTime).slice(0, 5),
        status: slot.status as any,
        is_active: slot.isActive,
        created_at: slot.createdAt.toISOString(),
        updated_at: slot.updatedAt.toISOString(),
      };
    }),

  createSlot: subscribedProcedure
    .input(createSlotInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create schedule slots",
        });
      }

      // Check for double booking conflicts on teacher or room
      const overlaps = await db
        .select()
        .from(scheduleSlots)
        .where(
          and(
            eq(scheduleSlots.schoolId, ctx.schoolId),
            eq(scheduleSlots.dayOfWeek, input.day_of_week),
            eq(scheduleSlots.isActive, true),
            or(
              eq(scheduleSlots.teacherId, input.teacher_id),
              eq(scheduleSlots.roomName, input.room_name)
            )
          )
        );

      const inputStart = input.start_time.slice(0, 5);
      const inputEnd = input.end_time.slice(0, 5);

      for (const slot of overlaps) {
        const slotStart = String(slot.startTime).slice(0, 5);
        const slotEnd = String(slot.endTime).slice(0, 5);

        if (inputStart < slotEnd && inputEnd > slotStart) {
          if (slot.teacherId === input.teacher_id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Öğretmen çakışması: Seçilen öğretmen bu gün ve saatte başka bir derse atanmış.",
            });
          }
          if (slot.roomName === input.room_name) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Sınıf/Oda çakışması: Seçilen sınıf/oda bu gün ve saatte başka bir derse atanmış.",
            });
          }
        }
      }

      const [inserted] = await db
        .insert(scheduleSlots)
        .values({
          schoolId: ctx.schoolId,
          classId: input.class_id,
          teacherId: input.teacher_id,
          roomName: input.room_name,
          dayOfWeek: input.day_of_week,
          startTime: input.start_time,
          endTime: input.end_time,
          status: input.status,
          isActive: true,
        })
        .returning();

      return { success: true, slotId: inserted.id };
    }),

  updateSlot: subscribedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateSlotInputSchema,
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
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can update schedule slots",
        });
      }

      const [currentSlot] = await db
        .select()
        .from(scheduleSlots)
        .where(
          and(
            eq(scheduleSlots.id, input.id),
            eq(scheduleSlots.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!currentSlot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule slot not found",
        });
      }

      const teacherId = input.data.teacher_id !== undefined ? input.data.teacher_id : currentSlot.teacherId;
      const roomName = input.data.room_name !== undefined ? input.data.room_name : currentSlot.roomName;
      const dayOfWeek = input.data.day_of_week !== undefined ? input.data.day_of_week : currentSlot.dayOfWeek;
      const startTime = input.data.start_time !== undefined ? input.data.start_time : String(currentSlot.startTime).slice(0, 5);
      const endTime = input.data.end_time !== undefined ? input.data.end_time : String(currentSlot.endTime).slice(0, 5);
      const isActive = input.data.is_active !== undefined ? input.data.is_active : currentSlot.isActive;

      if (isActive) {
        const overlaps = await db
          .select()
          .from(scheduleSlots)
          .where(
            and(
              eq(scheduleSlots.schoolId, ctx.schoolId),
              eq(scheduleSlots.dayOfWeek, dayOfWeek),
              eq(scheduleSlots.isActive, true),
              ne(scheduleSlots.id, input.id),
              or(
                eq(scheduleSlots.teacherId, teacherId),
                eq(scheduleSlots.roomName, roomName)
              )
            )
          );

        const inputStart = startTime.slice(0, 5);
        const inputEnd = endTime.slice(0, 5);

        for (const slot of overlaps) {
          const slotStart = String(slot.startTime).slice(0, 5);
          const slotEnd = String(slot.endTime).slice(0, 5);

          if (inputStart < slotEnd && inputEnd > slotStart) {
            if (slot.teacherId === teacherId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Öğretmen çakışması: Seçilen öğretmen bu gün ve saatte başka bir derse atanmış.",
              });
            }
            if (slot.roomName === roomName) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Sınıf/Oda çakışması: Seçilen sınıf/oda bu gün ve saatte başka bir derse atanmış.",
              });
            }
          }
        }
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (input.data.class_id !== undefined) updateData.classId = input.data.class_id;
      if (input.data.teacher_id !== undefined) updateData.teacherId = input.data.teacher_id;
      if (input.data.room_name !== undefined) updateData.roomName = input.data.room_name;
      if (input.data.day_of_week !== undefined) updateData.dayOfWeek = input.data.day_of_week;
      if (input.data.start_time !== undefined) updateData.startTime = input.data.start_time;
      if (input.data.end_time !== undefined) updateData.endTime = input.data.end_time;
      if (input.data.status !== undefined) updateData.status = input.data.status;
      if (input.data.is_active !== undefined) updateData.isActive = input.data.is_active;

      const [updated] = await db
        .update(scheduleSlots)
        .set(updateData)
        .where(
          and(
            eq(scheduleSlots.id, input.id),
            eq(scheduleSlots.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule slot not found",
        });
      }

      return { success: true };
    }),

  deleteSlot: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can delete schedule slots",
        });
      }

      const [deleted] = await db
        .update(scheduleSlots)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scheduleSlots.id, input.id),
            eq(scheduleSlots.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule slot not found",
        });
      }

      // Also deactivate all pending (scheduled) future lesson_sessions for this slot
      await db
        .update(lessonSessions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(lessonSessions.scheduleSlotId, deleted.id),
            eq(lessonSessions.status, 'scheduled')
          )
        );

      return { success: true };
    }),

  // Student Enrollment management
  enrollStudent: subscribedProcedure
    .input(enrollStudentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can enroll students",
        });
      }

      // Check if student exists
      const [std] = await db
        .select()
        .from(students)
        .where(and(eq(students.id, input.student_id), eq(students.schoolId, ctx.schoolId)))
        .limit(1);

      if (!std) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Check if student already enrolled in this class and active
      const [existing] = await db
        .select()
        .from(classEnrollments)
        .where(
          and(
            eq(classEnrollments.classId, input.class_id),
            eq(classEnrollments.studentId, input.student_id),
            eq(classEnrollments.schoolId, ctx.schoolId),
            eq(classEnrollments.isActive, true)
          )
        )
        .limit(1);

      if (existing) {
        return { success: true, message: "Student already enrolled" };
      }

      // Check if they have an inactive enrollment, and reactivate it, otherwise insert new
      const [inactive] = await db
        .select()
        .from(classEnrollments)
        .where(
          and(
            eq(classEnrollments.classId, input.class_id),
            eq(classEnrollments.studentId, input.student_id),
            eq(classEnrollments.schoolId, ctx.schoolId),
            eq(classEnrollments.isActive, false)
          )
        )
        .limit(1);

      if (inactive) {
        await db
          .update(classEnrollments)
          .set({ isActive: true })
          .where(eq(classEnrollments.id, inactive.id));
      } else {
        await db.insert(classEnrollments).values({
          schoolId: ctx.schoolId,
          classId: input.class_id,
          studentId: input.student_id,
          isActive: true,
        });
      }

      return { success: true };
    }),

  unenrollStudent: subscribedProcedure
    .input(enrollStudentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can unenroll students",
        });
      }

      await db
        .update(classEnrollments)
        .set({ isActive: false })
        .where(
          and(
            eq(classEnrollments.classId, input.class_id),
            eq(classEnrollments.studentId, input.student_id),
            eq(classEnrollments.schoolId, ctx.schoolId)
          )
        );

      return { success: true };
    }),

  listClassStudents: schoolProcedure
    .input(z.object({ class_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find students who have active enrollment in target class
      const rows = await db
        .select({
          id: students.id,
          fullName: students.fullName,
        })
        .from(students)
        .innerJoin(classEnrollments, eq(classEnrollments.studentId, students.id))
        .where(
          and(
            eq(classEnrollments.classId, input.class_id),
            eq(classEnrollments.schoolId, ctx.schoolId),
            eq(classEnrollments.isActive, true),
            eq(students.isActive, true)
          )
        )
        .orderBy(students.fullName);

      return rows.map((r) => ({
        id: r.id,
        full_name: r.fullName,
      }));
    }),

  listClassrooms: schoolProcedure
    .query(async ({ ctx }) => {
      return await db
        .select()
        .from(classrooms)
        .where(
          and(
            eq(classrooms.schoolId, ctx.schoolId),
            eq(classrooms.isActive, true)
          )
        )
        .orderBy(classrooms.name);
    }),

  createClassroom: subscribedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [inserted] = await db
        .insert(classrooms)
        .values({
          schoolId: ctx.schoolId,
          name: input.name,
        })
        .returning();
      return { success: true, classroom: inserted };
    }),

  updateClassroom: subscribedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(classrooms)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(classrooms.id, input.id),
            eq(classrooms.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Classroom not found",
        });
      }

      return { success: true, classroom: updated };
    }),

  deleteClassroom: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .update(classrooms)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(classrooms.id, input.id),
            eq(classrooms.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Classroom not found",
        });
      }

      return { success: true };
    }),

  cancelSlotForDate: subscribedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId || !ctx.schoolId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Admin check
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can cancel schedule slots",
        });
      }

      // Fetch current slot
      const [currentSlot] = await db
        .select()
        .from(scheduleSlots)
        .where(
          and(
            eq(scheduleSlots.id, input.id),
            eq(scheduleSlots.schoolId, ctx.schoolId)
          )
        )
        .limit(1);

      if (!currentSlot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule slot not found",
        });
      }

      const currentCancelledDates = (currentSlot.cancelledDates as string[]) || [];
      if (!currentCancelledDates.includes(input.date)) {
        currentCancelledDates.push(input.date);
      }

      await db
        .update(scheduleSlots)
        .set({
          cancelledDates: currentCancelledDates,
          updatedAt: new Date(),
        })
        .where(eq(scheduleSlots.id, input.id));

      return { success: true };
    }),

  // Virtual Register Procedures
  updateSessionLog: subscribedProcedure
    .input(
      z.object({
        session_id: z.string().uuid(),
        data: updateSessionLogInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(lessonSessions)
        .set({
          description: input.data.description,
          homework: input.data.homework,
          hoursTaught: input.data.hours_taught,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lessonSessions.id, input.session_id),
            eq(lessonSessions.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ders seansı bulunamadı.",
        });
      }

      return { success: true };
    }),

  saveTermReport: subscribedProcedure
    .input(saveTermReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Find teacher profile linked to user
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(eq(teachers.userId, ctx.userId))
        .limit(1);

      if (!teacher) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sadece öğretmenler dönem raporu yazabilir.",
        });
      }

      // Check if report already exists for this student and class
      const [existing] = await db
        .select()
        .from(studentTermReports)
        .where(
          and(
            eq(studentTermReports.schoolId, ctx.schoolId),
            eq(studentTermReports.classId, input.class_id),
            eq(studentTermReports.studentId, input.student_id)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(studentTermReports)
          .set({
            notes: input.notes,
            teacherId: teacher.id,
            updatedAt: new Date(),
          })
          .where(eq(studentTermReports.id, existing.id));
      } else {
        await db
          .insert(studentTermReports)
          .values({
            schoolId: ctx.schoolId,
            classId: input.class_id,
            studentId: input.student_id,
            teacherId: teacher.id,
            notes: input.notes,
          });
      }

      return { success: true };
    }),

  listTermReports: schoolProcedure
    .input(z.object({ class_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const reports = await db
        .select({
          id: studentTermReports.id,
          studentId: studentTermReports.studentId,
          teacherId: studentTermReports.teacherId,
          teacherName: teachers.fullName,
          notes: studentTermReports.notes,
          updatedAt: studentTermReports.updatedAt,
        })
        .from(studentTermReports)
        .innerJoin(teachers, eq(studentTermReports.teacherId, teachers.id))
        .where(
          and(
            eq(studentTermReports.schoolId, ctx.schoolId),
            eq(studentTermReports.classId, input.class_id)
          )
        );

      return reports;
    }),

  listClassSessionsWithLogs: schoolProcedure
    .input(z.object({ class_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sessions = await db
        .select({
          id: lessonSessions.id,
          sessionDate: lessonSessions.sessionDate,
          status: lessonSessions.status,
          description: lessonSessions.description,
          homework: lessonSessions.homework,
          hoursTaught: lessonSessions.hoursTaught,
          checkinAt: lessonSessions.checkinAt,
          checkoutAt: lessonSessions.checkoutAt,
          teacherId: lessonSessions.teacherId,
          teacherName: teachers.fullName,
          studentCount: lessonSessions.studentCount,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          roomName: scheduleSlots.roomName,
          slotTeacherId: scheduleSlots.teacherId,
        })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .leftJoin(teachers, eq(lessonSessions.teacherId, teachers.id))
        .where(
          and(
            eq(scheduleSlots.classId, input.class_id),
            eq(lessonSessions.schoolId, ctx.schoolId),
            eq(lessonSessions.isActive, true)
          )
        )
        .orderBy(desc(lessonSessions.sessionDate), desc(scheduleSlots.startTime));

      return sessions.map((s) => ({
        id: s.id,
        session_date: s.sessionDate,
        status: s.status,
        description: s.description || "",
        homework: s.homework || "",
        hours_taught: s.hoursTaught || 0,
        checkin_at: s.checkinAt ? s.checkinAt.toISOString() : null,
        checkout_at: s.checkoutAt ? s.checkoutAt.toISOString() : null,
        teacher_id: s.teacherId,
        teacher_name: s.teacherName || "Atanmamış",
        student_count: s.studentCount,
        start_time: String(s.startTime).slice(0, 5),
        end_time: String(s.endTime).slice(0, 5),
        room_name: s.roomName,
        is_cover: s.teacherId !== null && s.teacherId !== s.slotTeacherId,
      }));
    }),

  getTeacherMissingLogsCount: schoolProcedure
    .input(z.object({ teacher_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({ id: lessonSessions.id })
        .from(lessonSessions)
        .innerJoin(scheduleSlots, eq(lessonSessions.scheduleSlotId, scheduleSlots.id))
        .where(
          and(
            eq(lessonSessions.schoolId, ctx.schoolId),
            eq(lessonSessions.isActive, true),
            eq(lessonSessions.status, "completed"),
            or(
              eq(scheduleSlots.teacherId, input.teacher_id),
              eq(lessonSessions.teacherId, input.teacher_id)
            ),
            or(
              eq(lessonSessions.description, ""),
              isNull(lessonSessions.description)
            )
          )
        );

      return { count: rows.length };
    }),
});


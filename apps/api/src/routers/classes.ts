import { router, schoolProcedure } from "../trpc/trpc.js";
import { 
  createClassInputSchema, 
  updateClassInputSchema, 
  createSlotInputSchema, 
  updateSlotInputSchema,
  enrollStudentInputSchema
} from "@institute/types";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { classes, scheduleSlots, profiles, teachers, classEnrollments, students } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

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

  create: schoolProcedure
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
          isActive: input.is_active,
        })
        .returning();

      return { success: true, classId: inserted.id };
    }),

  update: schoolProcedure
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

  delete: schoolProcedure
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
          teacherId: scheduleSlots.teacherId,
          teacherName: teachers.fullName,
          roomName: scheduleSlots.roomName,
          dayOfWeek: scheduleSlots.dayOfWeek,
          startTime: scheduleSlots.startTime,
          endTime: scheduleSlots.endTime,
          status: scheduleSlots.status,
          isActive: scheduleSlots.isActive,
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
        teacher_id: r.teacherId,
        teacher_name: r.teacherName,
        room_name: r.roomName,
        day_of_week: r.dayOfWeek,
        start_time: String(r.startTime).slice(0, 5),
        end_time: String(r.endTime).slice(0, 5),
        status: r.status as any,
        is_active: r.isActive,
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

  createSlot: schoolProcedure
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

  updateSlot: schoolProcedure
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

  deleteSlot: schoolProcedure
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

      return { success: true };
    }),

  // Student Enrollment management
  enrollStudent: schoolProcedure
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

  unenrollStudent: schoolProcedure
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
});

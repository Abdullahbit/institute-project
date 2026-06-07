import { listTeachersInputSchema, teacherSchema, createTeacherInputSchema, updateTeacherInputSchema } from "@institute/types";
import { z } from "zod";
import { router, schoolProcedure, subscribedProcedure } from "../trpc/trpc.js";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { teachers, profiles } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export const teachersRouter = router({
  list: schoolProcedure
    .input(listTeachersInputSchema.optional())
    .output(z.array(teacherSchema))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(teachers.schoolId, ctx.schoolId),
        eq(teachers.isActive, true)
      ];

      if (input?.status) {
        conditions.push(eq(teachers.status, input.status));
      }

      const rows = await db
        .select()
        .from(teachers)
        .where(and(...conditions))
        .orderBy(teachers.fullName);

      return rows.map((row) => ({
        id: row.id,
        school_id: row.schoolId,
        user_id: row.userId,
        full_name: row.fullName,
        branch: row.branch,
        status: row.status as any,
        active_class_count: row.activeClassCount,
        monthly_hours: Number(row.monthlyHours),
        is_active: row.isActive,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      }));
    }),

  get: schoolProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [teacher] = await db
        .select()
        .from(teachers)
        .where(
          and(
            eq(teachers.id, input.id),
            eq(teachers.schoolId, ctx.schoolId),
            eq(teachers.isActive, true)
          )
        )
        .limit(1);

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      return {
        id: teacher.id,
        school_id: teacher.schoolId,
        user_id: teacher.userId,
        full_name: teacher.fullName,
        branch: teacher.branch,
        status: teacher.status as any,
        active_class_count: teacher.activeClassCount,
        monthly_hours: Number(teacher.monthlyHours),
        is_active: teacher.isActive,
        created_at: teacher.createdAt.toISOString(),
        updated_at: teacher.updatedAt.toISOString(),
      };
    }),

  create: subscribedProcedure
    .input(createTeacherInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Check role of caller (must be admin)
      const [caller] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!caller || caller.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create teacher profiles",
        });
      }

      // 1. Resolve matching Supabase Auth user if email is provided, or create if password is also provided
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
                role: "teacher",
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
              
              // Also sync profile in profiles table
              await db.insert(profiles).values({
                id: userId,
                schoolId: ctx.schoolId,
                role: "teacher",
                fullName: input.full_name,
                isActive: true,
              });
            }
          }
        } catch (e: any) {
          console.error("Failed to lookup/create auth user by email:", e);
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: e?.message || "Failed to create teacher credentials",
          });
        }
      }

      // 2. Insert teacher profile
      const [inserted] = await db
        .insert(teachers)
        .values({
          schoolId: ctx.schoolId,
          fullName: input.full_name,
          branch: input.branch,
          status: input.status,
          userId,
          isActive: true,
        })
        .returning();

      return {
        success: true,
        teacherId: inserted.id,
        user_id: inserted.userId,
      };
    }),

  update: subscribedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateTeacherInputSchema,
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
          message: "Only administrators can update teacher profiles",
        });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (input.data.full_name !== undefined) updateData.fullName = input.data.full_name;
      if (input.data.branch !== undefined) updateData.branch = input.data.branch;
      if (input.data.status !== undefined) updateData.status = input.data.status;
      if (input.data.is_active !== undefined) updateData.isActive = input.data.is_active;

      // Match auth user if email changed
      if (input.data.email && ctx.supabase) {
        try {
          const { data: listData } = await ctx.supabase.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u: any) => u.email === input.data.email);
          if (existingUser) {
            updateData.userId = existingUser.id;
          }
        } catch (e) {
          console.error("Failed to lookup auth user during update:", e);
        }
      }

      const [updated] = await db
        .update(teachers)
        .set(updateData)
        .where(
          and(
            eq(teachers.id, input.id),
            eq(teachers.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
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
          message: "Only administrators can delete teacher profiles",
        });
      }

      // Perform soft delete
      const [deleted] = await db
        .update(teachers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(teachers.id, input.id),
            eq(teachers.schoolId, ctx.schoolId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      return { success: true };
    }),
});

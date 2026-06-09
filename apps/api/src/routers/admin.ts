import { router, publicProcedure, schoolProcedure, subscribedProcedure } from "../trpc/trpc.js";
import { createInvitationInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { schools, profiles, invitations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const adminRouter = router({
  seed: publicProcedure.mutation(async ({ ctx }) => {
    // 1. Upsert Bright Minds Dil Okulu
    const schoolAId = "a0000000-0000-4000-8000-000000000001";
    await db.insert(schools).values({
      id: schoolAId,
      name: "Bright Minds Dil Okulu",
      subdomain: "brightminds",
      isActive: true,
    }).onConflictDoUpdate({
      target: schools.id,
      set: {
        name: "Bright Minds Dil Okulu",
        subdomain: "brightminds",
        isActive: true,
        updatedAt: new Date(),
      }
    });

    // 2. Upsert School B
    const schoolBId = "b0000000-0000-4000-8000-000000000002";
    await db.insert(schools).values({
      id: schoolBId,
      name: "School B",
      subdomain: "schoolb",
      isActive: true,
    }).onConflictDoUpdate({
      target: schools.id,
      set: {
        name: "School B",
        subdomain: "schoolb",
        isActive: true,
        updatedAt: new Date(),
      }
    });

    if (!ctx.supabase) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Supabase client not initialized",
      });
    }

    const adminEmail = "simaalouzi@gmail.com";
    const adminPassword = "SimaEdu2026!";

    // 3. Create or update tenant administrator in Supabase Auth via Admin API
    let authUser;
    const { data: listData, error: listError } = await ctx.supabase.auth.admin.listUsers();
    if (listError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to list auth users: ${listError.message}`,
      });
    }

    const existingUser = listData?.users.find((u) => u.email === adminEmail);
    if (existingUser) {
      const { data: updateData, error: updateError } = await ctx.supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: adminPassword,
          user_metadata: {
            school_id: schoolAId,
            role: "admin",
            full_name: "Sima Admin",
          },
        }
      );
      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update auth user: ${updateError.message}`,
        });
      }
      authUser = updateData.user;
    } else {
      const { data: createData, error: createError } = await ctx.supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        user_metadata: {
          school_id: schoolAId,
          role: "admin",
          full_name: "Sima Admin",
        },
        email_confirm: true,
      });
      if (createError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create auth user: ${createError.message}`,
        });
      }
      authUser = createData.user;
    }

    // 4. Sync profile into profiles table
    await db.insert(profiles).values({
      id: authUser.id,
      schoolId: schoolAId,
      role: "admin",
      fullName: "Sima Admin",
      isActive: true,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        schoolId: schoolAId,
        role: "admin",
        fullName: "Sima Admin",
        isActive: true,
        updatedAt: new Date(),
      }
    });

    return {
      success: true,
      schoolAId,
      schoolBId,
      adminId: authUser.id,
    };
  }),

  inviteUser: schoolProcedure
    .input(createInvitationInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Require authenticated 'admin' role badge
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Check role of caller
      const [callerProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (!callerProfile || callerProfile.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can invite users",
        });
      }

      // 2. Generate a secure token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + input.expires_in_hours * 60 * 60 * 1000);

      // 3. Register a new row in invitations table linked to school_id
      await db.insert(invitations).values({
        schoolId: ctx.schoolId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt,
        createdAt,
        isActive: true,
      });

      // 4. Return raw token string
      return {
        rawToken,
        email: input.email,
        role: input.role,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  createSchoolAndAdmin: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      subdomain: z.string().min(1),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(6),
      adminFullName: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check if subdomain is unique
      const existingSchool = await db.select().from(schools).where(eq(schools.subdomain, input.subdomain.toLowerCase())).limit(1);
      if (existingSchool.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bu alt alan adı (subdomain) zaten kullanımda.",
        });
      }

      // 2. Insert School
      const [newSchool] = await db.insert(schools).values({
        name: input.name,
        subdomain: input.subdomain.toLowerCase(),
        isActive: true,
      }).returning();

      if (!ctx.supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase client not initialized",
        });
      }

      // 3. Create user in Supabase Auth
      const { data: createData, error: createError } = await ctx.supabase.auth.admin.createUser({
        email: input.adminEmail,
        password: input.adminPassword,
        user_metadata: {
          school_id: newSchool.id,
          role: "admin",
          full_name: input.adminFullName,
        },
        email_confirm: true,
      });

      if (createError) {
        // Rollback school insert
        await db.delete(schools).where(eq(schools.id, newSchool.id));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Kullanıcı oluşturulamadı: ${createError.message}`,
        });
      }

      const authUser = createData.user;

      // 4. Sync profile into profiles table
      await db.insert(profiles).values({
        id: authUser.id,
        schoolId: newSchool.id,
        role: "admin",
        fullName: input.adminFullName,
        isActive: true,
      });

      return {
        success: true,
        schoolId: newSchool.id,
        adminId: authUser.id,
      };
    }),

  listSchools: publicProcedure
    .query(async ({ ctx }) => {
      const allSchools = await db.select().from(schools);
      const allProfiles = await db.select().from(profiles).where(eq(profiles.role, "admin"));
      
      let authUsers: any[] = [];
      if (ctx.supabase) {
        const { data: listData } = await ctx.supabase.auth.admin.listUsers();
        if (listData?.users) {
          authUsers = listData.users;
        }
      }

      return allSchools.map((school) => {
        // Find admins for this school
        const schoolAdmins = allProfiles.filter((p) => p.schoolId === school.id);
        const adminsDetail = schoolAdmins.map((admin) => {
          const authUser = authUsers.find((u) => u.id === admin.id);
          return {
            id: admin.id,
            fullName: admin.fullName,
            email: authUser?.email || "Bilinmiyor",
          };
        });

        return {
          id: school.id,
          name: school.name,
          subdomain: school.subdomain,
          isActive: school.isActive,
          createdAt: school.createdAt,
          admins: adminsDetail,
        };
      });
    }),

  getSchoolBranding: schoolProcedure
    .query(async ({ ctx }) => {
      const [school] = await db
        .select({
          id: schools.id,
          name: schools.name,
          logoUrl: schools.logoUrl,
          themeColor: schools.themeColor,
        })
        .from(schools)
        .where(eq(schools.id, ctx.schoolId))
        .limit(1);

      if (!school) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "School not found",
        });
      }

      return school;
    }),

  updateSchoolBranding: subscribedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        logo_url: z.string().url().or(z.string().length(0)).nullable().optional(),
        theme_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).or(z.string().length(0)).nullable().optional(),
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
          message: "Only administrators can update school configuration",
        });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.logo_url !== undefined) updateData.logoUrl = input.logo_url || null;
      if (input.theme_color !== undefined) updateData.themeColor = input.theme_color || null;

      await db
        .update(schools)
        .set(updateData)
        .where(eq(schools.id, ctx.schoolId));

      return { success: true };
    }),
});

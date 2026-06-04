import { router, publicProcedure, schoolProcedure } from "../trpc/trpc.js";
import { createInvitationInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
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

    const adminEmail = "admin@school-a.com";
    const adminPassword = "password123";

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
            full_name: "Alpha School Admin",
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
          full_name: "Alpha School Admin",
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
      fullName: "Alpha School Admin",
      isActive: true,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        schoolId: schoolAId,
        role: "admin",
        fullName: "Alpha School Admin",
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

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + input.expires_in_hours);

      // 3. Register a new row in invitations table linked to school_id
      await db.insert(invitations).values({
        schoolId: ctx.schoolId,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt,
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
});

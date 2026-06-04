import { router, publicProcedure } from "../trpc/trpc.js";
import { acceptInvitationInputSchema } from "@institute/types";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { schools, profiles, invitations, teachers, students } from "@workspace/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

export const authRouter = router({
  validateInviteToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const [invitation] = await db
        .select({
          id: invitations.id,
          schoolId: invitations.schoolId,
          email: invitations.email,
          role: invitations.role,
          expiresAt: invitations.expiresAt,
          acceptedAt: invitations.acceptedAt,
          isActive: invitations.isActive,
          schoolName: schools.name,
          schoolSubdomain: schools.subdomain,
        })
        .from(invitations)
        .innerJoin(schools, eq(invitations.schoolId, schools.id))
        .where(
          and(
            eq(invitations.tokenHash, tokenHash),
            eq(invitations.isActive, true),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Davetiye bulunamadı, süresi geçmiş ya da daha önce kullanılmış.",
        });
      }

      return {
        email: invitation.email,
        role: invitation.role,
        school: {
          id: invitation.schoolId,
          name: invitation.schoolName,
          subdomain: invitation.schoolSubdomain,
        },
      };
    }),

  acceptInvitation: publicProcedure
    .input(acceptInvitationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase client not initialized",
        });
      }

      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      // 1. Resolve and validate the invitation token
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.tokenHash, tokenHash),
            eq(invitations.isActive, true),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Geçersiz veya süresi dolmuş davetiye.",
        });
      }

      // 2. Provision new account inside Supabase Auth via Admin API
      const { data: createData, error: createError } = await ctx.supabase.auth.admin.createUser({
        email: invitation.email,
        password: input.password,
        user_metadata: {
          school_id: invitation.schoolId,
          role: invitation.role,
          full_name: input.fullName,
        },
        email_confirm: true,
      });

      if (createError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Kullanıcı oluşturulamadı: ${createError.message}`,
        });
      }

      const authUser = createData.user;

      // 3. Synchronize user details into public profiles table
      await db.insert(profiles).values({
        id: authUser.id,
        schoolId: invitation.schoolId,
        role: invitation.role,
        fullName: input.fullName,
        isActive: true,
      });

      // Synchronize to teachers or students table if applicable
      if (invitation.role === "teacher") {
        await db.insert(teachers).values({
          schoolId: invitation.schoolId,
          userId: authUser.id,
          fullName: input.fullName,
          branch: "General", // Default branch
          status: "active",
          activeClassCount: 0,
          monthlyHours: "0.00",
          isActive: true,
        });
      } else if (invitation.role === "student") {
        await db.insert(students).values({
          schoolId: invitation.schoolId,
          userId: authUser.id,
          fullName: input.fullName,
          isActive: true,
        });
      }

      // 4. Mark invitation as accepted
      await db
        .update(invitations)
        .set({
          acceptedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      return {
        success: true,
        userId: authUser.id,
        email: authUser.email,
        role: invitation.role,
      };
    }),
});

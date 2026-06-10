import { router, schoolProcedure } from "../trpc/trpc.js";
import { z } from "zod";
import { db } from "@workspace/db";
import { messages, profiles } from "@workspace/db/schema";
import { eq, and, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const messagesRouter = router({
  getContactList: schoolProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.userId;
      const schoolId = ctx.schoolId;

      if (!userId || !schoolId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User and school context required",
        });
      }

      // 1. Fetch all active profiles in the school (excluding current user)
      const allProfiles = await db
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.schoolId, schoolId),
            eq(profiles.isActive, true),
            ne(profiles.id, userId)
          )
        )
        .orderBy(profiles.fullName);

      // 2. Fetch all messages in the school involving current user to compute last messages & unread counts
      const userMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.schoolId, schoolId),
            or(
              eq(messages.senderId, userId),
              eq(messages.receiverId, userId)
            )
          )
        )
        .orderBy(messages.createdAt);

      // 3. Process messages in JS to build details mapping
      const contactsMap = new Map<string, { lastMessage?: string; lastMessageAt?: string; unreadCount: number }>();

      for (const msg of userMessages) {
        const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        const existing = contactsMap.get(otherUserId) || { unreadCount: 0 };
        
        existing.lastMessage = msg.content;
        existing.lastMessageAt = msg.createdAt.toISOString();
        
        if (msg.receiverId === userId && !msg.isRead) {
          existing.unreadCount += 1;
        }
        
        contactsMap.set(otherUserId, existing);
      }

      // 4. Map profiles with their respective details
      const contacts = allProfiles.map((p) => {
        const detail = contactsMap.get(p.id) || { unreadCount: 0 };
        return {
          id: p.id,
          fullName: p.fullName,
          role: p.role as "admin" | "teacher" | "student",
          lastMessage: detail.lastMessage || null,
          lastMessageAt: detail.lastMessageAt || null,
          unreadCount: detail.unreadCount,
        };
      });

      // 5. Sort by last message timestamp desc (if present), fallback to alphabetical order
      contacts.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return b.lastMessageAt.localeCompare(a.lastMessageAt);
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.fullName.localeCompare(b.fullName);
      });

      return contacts;
    }),

  getMessages: schoolProcedure
    .input(z.object({ otherUserId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const schoolId = ctx.schoolId;

      if (!userId || !schoolId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User and school context required",
        });
      }

      const chatMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.schoolId, schoolId),
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, input.otherUserId)),
              and(eq(messages.senderId, input.otherUserId), eq(messages.receiverId, userId))
            )
          )
        )
        .orderBy(messages.createdAt);

      return chatMessages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
      }));
    }),

  sendMessage: schoolProcedure
    .input(
      z.object({
        receiverId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const schoolId = ctx.schoolId;

      if (!userId || !schoolId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User and school context required",
        });
      }

      const [inserted] = await db
        .insert(messages)
        .values({
          schoolId: schoolId,
          senderId: userId,
          receiverId: input.receiverId,
          content: input.content,
          isRead: false,
        })
        .returning();

      return {
        id: inserted.id,
        senderId: inserted.senderId,
        receiverId: inserted.receiverId,
        content: inserted.content,
        isRead: inserted.isRead,
        createdAt: inserted.createdAt.toISOString(),
      };
    }),

  markAsRead: schoolProcedure
    .input(z.object({ senderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const schoolId = ctx.schoolId;

      if (!userId || !schoolId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User and school context required",
        });
      }

      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.schoolId, schoolId),
            eq(messages.senderId, input.senderId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          )
        );

      return { success: true };
    }),
});

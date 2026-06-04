"use client";

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@institute/api/router";

export const trpc = createTRPCReact<AppRouter>();

const schoolId =
  process.env.NEXT_PUBLIC_DEV_SCHOOL_ID ??
  "a0000000-0000-4000-8000-000000000001";

export function createTrpcClient() {
  const base =
    typeof window !== "undefined"
      ? ""
      : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${base}/trpc`,
        async headers() {
          const headers: Record<string, string> = {
            "x-school-id": schoolId,
          };
          if (typeof window !== "undefined") {
            try {
              const { supabase } = await import("./supabaseClient");
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                headers["x-user-id"] = session.user.id;
                headers["Authorization"] = `Bearer ${session.access_token}`;
              }
            } catch (err) {
              console.error("Error setting tRPC auth headers:", err);
            }
          }
          return headers;
        },
      }),
    ],
  });
}

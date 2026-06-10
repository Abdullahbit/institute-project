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
          let activeSchoolId = schoolId;
          const headers: Record<string, string> = {};

          if (typeof window !== "undefined") {
            try {
              const { supabase } = await import("./supabaseClient");
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                headers["x-user-id"] = session.user.id;
                headers["Authorization"] = `Bearer ${session.access_token}`;
                
                const userSchoolId = session.user.user_metadata?.school_id;
                if (userSchoolId) {
                  activeSchoolId = userSchoolId;
                }
              }
            } catch (err) {
              console.error("Error setting tRPC auth headers:", err);
            }
          }

          headers["x-school-id"] = activeSchoolId;
          return headers;
        },
      }),
    ],
  });
}

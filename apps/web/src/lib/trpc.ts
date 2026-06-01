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
        headers() {
          return {
            "x-school-id": schoolId,
          };
        },
      }),
    ],
  });
}

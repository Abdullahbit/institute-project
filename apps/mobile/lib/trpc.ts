import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@institute/api/router";

export const trpc = createTRPCReact<AppRouter>();

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const schoolId =
  process.env.EXPO_PUBLIC_DEV_SCHOOL_ID ??
  "a0000000-0000-4000-8000-000000000001";

let activeUserId: string | null = null;

export function setActiveUserId(id: string | null) {
  activeUserId = id;
}

export function getActiveUserId() {
  return activeUserId;
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        headers() {
          const headers: Record<string, string> = { "x-school-id": schoolId };
          if (activeUserId) {
            headers["x-user-id"] = activeUserId;
          }
          return headers;
        },
      }),
    ],
  });
}

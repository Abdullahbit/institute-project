import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { trpc, createTrpcClient } from "../lib/trpc";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Institute" }} />
          <Stack.Screen name="teacher" options={{ title: "Öğretmen" }} />
          <Stack.Screen name="student" options={{ title: "Öğrenci" }} />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

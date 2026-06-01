import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { serve } from "inngest/fastify";
import { appRouter, type AppRouter } from "./routers";
import { createContext } from "./trpc/context";
import { inngest } from "./inngest/client";
import { inngestFunctions } from "./inngest/functions";
import { logger } from "./lib/logger";

export async function buildServer() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        logger.error({ path, err: error }, "tRPC error");
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  await app.register(
    async (instance) => {
      await instance.register(serve({ client: inngest, functions: inngestFunctions }));
    },
    { prefix: "/api/inngest" },
  );

  app.get("/healthz", async () => ({ status: "ok" }));

  return app;
}

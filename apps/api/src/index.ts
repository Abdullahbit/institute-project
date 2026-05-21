import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { initTRPC } from '@trpc/server';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { z } from 'zod';
import { env } from './env';
import { createClient } from '@supabase/supabase-js';

// Load variables
const PORT = env.PORT;
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Setup tRPC v11
const t = initTRPC.create();

export const appRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name || 'World'} from LingoFlow tRPC API!`,
        timestamp: new Date().toISOString(),
      };
    }),
});

export type AppRouter = typeof appRouter;

const server = Fastify({
  logger: true,
});

async function main() {
  // Register plugins
  await server.register(cors, {
    origin: true,
  });
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register tRPC fastify adapter
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: ({ req, res }) => ({ req, res }),
    },
  });

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify + tRPC server running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();

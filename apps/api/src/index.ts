import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { buildServer } from "./server.js";

async function main() {
  const app = await buildServer();

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    logger.info(`API listening on http://localhost:${env.port}`);
    logger.info(`tRPC at http://localhost:${env.port}/trpc`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

main();

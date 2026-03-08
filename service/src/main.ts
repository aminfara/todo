/* eslint-disable n/no-process-exit */
/* eslint-disable unicorn/no-process-exit */

import { createServer, type Server } from "@/server.js";

const DEV_PORT = 3000;
const DEV_HOST = "localhost";

async function main() {
  const server = await createServer({});

  // Handle graceful shutdown
  registerShutdownHandlers(server);

  try {
    await server.listen({ port: DEV_PORT, host: DEV_HOST });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

function registerShutdownHandlers(server: Server) {
  const shutdown = () => {
    const { logger } = server.diContainer.cradle;
    logger.info("Graceful shutdown initiated...");
    server
      .close()
      .then(() => {
        logger.info("Server has been gracefully shut down");
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error({ error }, "Shutdown failed with error");
        process.exit(1);
      });
  };

  // Register signal handlers - fix by wrapping async function to properly handle promises
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

await main();

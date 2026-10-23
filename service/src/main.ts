import { createApp } from "./app";
import { getPrintableConfig } from "./config";
import { createContainer } from "./container";

const container = createContainer();
const { config, logger } = container;
logger.info({ config: getPrintableConfig(config) }, "Loaded configuration");

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: createApp({ container }).fetch,
});
logger.info(`Listening on ${server.url}`);

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");
  try {
    await server.stop(); // lets in-flight requests finish
    await container.dispose();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Shutdown failed");
    process.exit(1);
  }
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

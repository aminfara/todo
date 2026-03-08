import { setupDiContainer, setupScopedDiContainer } from "@/container.js";
import { registerPlugins } from "@/plugins/index.js";
import { registerRoutes } from "@/routes.js";
import { diContainer } from "@fastify/awilix";
import Fastify, { type FastifyHttpOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { Server as HttpServer } from "node:http";

export interface CreateServerParams {
  options?: FastifyHttpOptions<HttpServer>;
}

export async function createServer({ options = {} }: CreateServerParams) {
  setupDiContainer();

  const { config, logger } = diContainer.cradle;

  logger.info({ config }, "Loaded configuration");

  const server = Fastify({
    loggerInstance: logger,
    ...options,
  });

  setupScopedDiContainer({ fastify: server });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.log.info("Initializing server");

  await registerPlugins({ fastify: server });
  await registerRoutes({ fastify: server });

  server.log.info("Server initialized successfully");

  return server;
}

export type Server = Awaited<ReturnType<typeof createServer>>;

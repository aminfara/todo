import { FastifyInstance } from "fastify";

interface RegisterRoutesParams {
  fastify: FastifyInstance;
}

export async function registerRoutes({ fastify }: RegisterRoutesParams): Promise<void> {
  const { logger } = fastify.diContainer.cradle;

  logger.info("Registering routes...");

  await fastify.register(
    async (fastify, _options) => {
      await fastify.register(fastify.diContainer.cradle.rootRoutes.plugin);
    },
    {
      prefix: "/api/v1",
    },
  );
}

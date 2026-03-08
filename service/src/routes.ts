import { FastifyInstance } from "fastify";

interface RegisterRoutesParams {
  fastify: FastifyInstance;
}

export async function registerRoutes({ fastify }: RegisterRoutesParams): Promise<void> {
  fastify.log.info("Registering routes...");

  await fastify.register(
    // Redirect root path to API version 1
    async (fastify, _options) => {
      fastify.get("/", async (request, reply) => {
        fastify.log.debug(request);
        reply.redirect("/api/v1" + request.raw.url);
      });
    },
    {
      prefix: "/",
    },
  );

  await fastify.register(
    async (fastify, _options) => {
      await fastify.register(fastify.diContainer.cradle.rootRoutes.plugin);
    },
    {
      prefix: "/api/v1",
    },
  );
}

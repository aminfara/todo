import { sensiblePlugin } from "@/plugins/sensible.js";
import { FastifyInstance } from "fastify";

interface RegisterPluginsParams {
  fastify: FastifyInstance;
}

export async function registerPlugins({ fastify }: RegisterPluginsParams) {
  fastify.log.info("Registering plugins...");

  await fastify.register(sensiblePlugin);
}

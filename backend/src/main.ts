import Fastify from "fastify";
import type { FastifyZod } from "fastify-zod";
import { buildJsonSchemas, register } from "fastify-zod";
import { z } from "zod";
import { greet } from "./hello.js";

// Create Fastify instance
const fastify = Fastify({
  logger: true,
});

// Define models using Zod
const HelloQuery = z.object({
  name: z.string().optional().default("Guest"),
});

const HelloResponse = z.object({
  message: z.string(),
});

// Group all models
const models = {
  HelloQuery,
  HelloResponse,
};

// Build JSON schemas
const jsonSchemas = buildJsonSchemas(models);

// Add type declaration for fastify-zod
declare module "fastify" {
  interface FastifyInstance {
    readonly zod: FastifyZod<typeof models>;
  }
}

// Register fastify-zod
const start = async (): Promise<void> => {
  try {
    await register(fastify, {
      jsonSchemas,
    });

    // Register routes using fastify-zod
    fastify.zod.get(
      "/hello",
      {
        operationId: "getHello",
        querystring: "HelloQuery",
        reply: "HelloResponse",
      },
      async ({ query: { name } }) => {
        // Use the existing greet function with the validated name
        const message = await Promise.resolve(greet(name));

        // Return the response that matches HelloResponse schema
        return { message };
      },
    );

    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (error) {
    fastify.log.error(error);
    throw error;
  }
};

void start();

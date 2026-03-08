import sensible, { FastifySensibleOptions } from "@fastify/sensible";
import fp from "fastify-plugin";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export const sensiblePlugin = fp<FastifySensibleOptions>(async (fastify) => {
  await fastify.register(sensible);
  fastify.log.debug("Sensible plugin loaded");
});

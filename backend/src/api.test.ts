import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { greet } from "./hello.js";

// Define the expected response type
interface HelloResponse {
  message: string;
}

describe("Hello API Endpoint", () => {
  const fastify = Fastify();

  // Define query parameter schema using Zod (same as in main.ts)
  const HelloQuerySchema = z.object({
    name: z.string().optional().default("Guest"),
  });

  // Register the route for testing
  beforeAll(() => {
    fastify.get("/hello", (request) => {
      // Validate and parse query parameters using the schema
      const query = HelloQuerySchema.parse(request.query);

      // Use the existing greet function with the validated name
      const message = greet(query.name);

      // Return the response
      return { message };
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    await fastify.close();
  });

  it("should return a greeting with default name when no query param is provided", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/hello",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as HelloResponse;
    expect(body).toEqual({ message: "Hello, Guest!" });
  });

  it("should return a greeting with the name from query parameter", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/hello?name=World",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as HelloResponse;
    expect(body).toEqual({ message: "Hello, World!" });
  });

  it("should handle URL encoded query parameters correctly", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/hello?name=John%20Doe",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as HelloResponse;
    expect(body).toEqual({ message: "Hello, John Doe!" });
  });
});

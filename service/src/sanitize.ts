import { z } from "zod";

/**
 * Output sanitation: keeps only the fields the schema names, at every depth, and nothing else. It
 * does not validate or coerce, so it is cheap and cannot fail. Use it on whatever leaves the API
 * (c.json is a plain JSON.stringify and would send every field of the object it is given).
 */
export function sanitize<S extends z.ZodType>(schema: S, value: z.output<S>): z.output<S> {
  return pick(schema, value) as z.output<S>;
}

function pick(schema: z.ZodType, value: unknown): unknown {
  if (value === null || typeof value !== "object" || value instanceof Date) return value;

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return pick(schema.unwrap() as z.ZodType, value);
  }
  if (schema instanceof z.ZodArray) {
    return Array.isArray(value) ? value.map((item) => pick(schema.element as z.ZodType, item)) : value;
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key in source) result[key] = pick(fieldSchema, source[key]);
    }
    return result;
  }
  return value;
}

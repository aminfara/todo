import type { ValidationTargets } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";
import { BadRequestError } from "./errors";

export class ValidationError extends BadRequestError {
  constructor(issues: { path: string; message: string }[], options?: ErrorOptions) {
    super("Request validation failed", { ...options, details: { issues } });
  }
}

/** Parses `value` with `schema` and returns the output, or throws a ValidationError. */
export function validate<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      { cause: result.error },
    );
  }
  return result.data;
}

/**
 * Declares the type of one request part for the typed client (`hc`) without validating it. The
 * service validates its own requests, so the route only states the contract and passes the value on.
 * Hono still parses the body, so malformed JSON is a 400.
 */
export const input = <S extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, _schema: S) =>
  validator(target, (value) => value as z.input<S>);

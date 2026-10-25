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

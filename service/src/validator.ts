import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { BadRequestError } from "./errors";

export class ValidationError extends BadRequestError {
  constructor(issues: { path: string; message: string }[], options?: ErrorOptions) {
    super("Request validation failed", { ...options, details: { issues } });
  }
}

/**
 * zValidator that throws a ValidationError, so the app's onError renders every failure the same
 * way. The stock validator would answer with the raw ZodError.
 */
export const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        { cause: result.error },
      );
    }
  });

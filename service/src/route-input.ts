import type { ValidationTargets } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";

/**
 * Declares the type of one request part for the typed client (`hc`) without validating it. The
 * service validates its own requests, so the route only states the contract and passes the value on.
 * Hono still parses the body, so malformed JSON is a 400.
 */
export const input = <S extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, _schema: S) =>
  validator(target, (value) => value as z.input<S>);

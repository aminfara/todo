import { zValidator as zv } from "@hono/zod-validator";
import { Hono, type ValidationTargets } from "hono";
import type { ZodType } from "zod";
import {
  createTaskSchema,
  toTaskResponse,
  updateTaskSchema,
} from "./task.model";
import type { TaskService } from "./task.service";

// Replaces the validator's default body (a raw ZodError) with our error shape.
const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "validation_failed" as const,
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }
  });

export const createTaskHandler = (service: TaskService) =>
  new Hono()
    .get("/", (c) => c.json(service.list().map(toTaskResponse)))
    .post("/", zValidator("json", createTaskSchema), (c) =>
      c.json(toTaskResponse(service.create(c.req.valid("json"))), 201),
    )
    .get("/:id", (c) => c.json(toTaskResponse(service.get(c.req.param("id")))))
    .patch("/:id", zValidator("json", updateTaskSchema), (c) =>
      c.json(
        toTaskResponse(service.update(c.req.param("id"), c.req.valid("json"))),
      ),
    )
    .delete("/:id", (c) => {
      service.delete(c.req.param("id"));
      return c.body(null, 204);
    });

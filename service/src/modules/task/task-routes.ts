import { Hono } from "hono";
import { sanitize } from "../../sanitize";
import { zValidator } from "../../validator";
import {
  createTaskRequestSchema,
  createTaskResponseSchema,
  deleteTaskRequestSchema,
  deleteTaskResponseSchema,
  getTaskRequestSchema,
  getTaskResponseSchema,
  listTasksResponseSchema,
  updateTaskRequestSchema,
  updateTaskResponseSchema,
} from "./task-models";
import type { TaskService } from "./task-service";

export interface CreateTaskRoutesParameters {
  taskService: TaskService;
}

// The boundary adapts to the domain: the id arrives in the path, so the body is the request minus id.
const updateTaskBodySchema = updateTaskRequestSchema.omit({ id: true });

/** Mounted by the app under `/tasks`. Handlers translate HTTP to service calls and back. */
export function createTaskRoutes({ taskService }: CreateTaskRoutesParameters) {
  return {
    routes: new Hono()
      .get("/", async (c) => c.json(sanitize(listTasksResponseSchema, await taskService.list())))
      .post("/", zValidator("json", createTaskRequestSchema), async (c) =>
        c.json(sanitize(createTaskResponseSchema, await taskService.create(c.req.valid("json"))), 201),
      )
      .get("/:id", zValidator("param", getTaskRequestSchema), async (c) =>
        c.json(sanitize(getTaskResponseSchema, await taskService.get(c.req.valid("param")))),
      )
      .patch(
        "/:id",
        zValidator("param", getTaskRequestSchema),
        zValidator("json", updateTaskBodySchema),
        async (c) =>
          c.json(
            sanitize(
              updateTaskResponseSchema,
              await taskService.update({ ...c.req.valid("param"), ...c.req.valid("json") }),
            ),
          ),
      )
      .delete("/:id", zValidator("param", deleteTaskRequestSchema), async (c) =>
        c.json(sanitize(deleteTaskResponseSchema, await taskService.delete(c.req.valid("param")))),
      ),
  };
}

export type TaskRoutes = ReturnType<typeof createTaskRoutes>;

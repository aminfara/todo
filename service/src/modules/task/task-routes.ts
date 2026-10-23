import { Hono } from "hono";
import { zValidator } from "../../validator";
import {
  createTaskBody,
  toTaskResponse,
  toTasksResponse,
  updateTaskBody,
} from "./task-model";
import type { TaskService } from "./task-service";

export interface CreateTaskRoutesParameters {
  taskService: TaskService;
}

/** Mounted by the app under `/tasks`. Handlers only translate HTTP to service calls. */
export function createTaskRoutes({ taskService }: CreateTaskRoutesParameters) {
  return {
    routes: new Hono()
      .get("/", async (c) => c.json(toTasksResponse(await taskService.list())))
      .post("/", zValidator("json", createTaskBody), async (c) =>
        c.json(toTaskResponse(await taskService.create(c.req.valid("json"))), 201),
      )
      .get("/:id", async (c) =>
        c.json(toTaskResponse(await taskService.get({ id: c.req.param("id") }))),
      )
      .patch("/:id", zValidator("json", updateTaskBody), async (c) =>
        c.json(
          toTaskResponse(
            await taskService.update({ id: c.req.param("id"), ...c.req.valid("json") }),
          ),
        ),
      )
      .delete("/:id", async (c) => {
        await taskService.delete({ id: c.req.param("id") });
        return c.body(null, 204);
      }),
  };
}

export type TaskRoutes = ReturnType<typeof createTaskRoutes>;

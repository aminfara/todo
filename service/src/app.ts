import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createTaskModule, TaskNotFoundError } from "./modules/task";
import type { TaskRepo } from "./modules/task/task.repo";

type Deps = { taskRepo?: TaskRepo };

export const createApp = ({ taskRepo }: Deps = {}) =>
  new Hono()
    .use(cors())
    .route("/tasks", createTaskModule(taskRepo))
    .onError((err, c) => {
      if (err instanceof TaskNotFoundError) {
        return c.json({ error: "not_found", message: err.message }, 404);
      }
      if (err instanceof HTTPException) return err.getResponse();
      console.error(err);
      return c.json({ error: "internal_error" }, 500);
    });

export type AppType = ReturnType<typeof createApp>;

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createTodoModule, TodoNotFoundError } from "./modules/todo";
import type { TodoRepo } from "./modules/todo/todo.repo";

type Deps = { todoRepo?: TodoRepo };

export const createApp = ({ todoRepo }: Deps = {}) =>
  new Hono()
    .use(cors())
    .route("/todos", createTodoModule(todoRepo))
    .onError((err, c) => {
      if (err instanceof TodoNotFoundError) {
        return c.json({ error: "not_found", message: err.message }, 404);
      }
      if (err instanceof HTTPException) return err.getResponse();
      console.error(err);
      return c.json({ error: "internal_error" }, 500);
    });

export type AppType = ReturnType<typeof createApp>;

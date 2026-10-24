import { Hono, type Context } from "hono";
import type { AppEnv } from "../../request-scope";
import { input } from "../../validator";
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
import type { TaskService, TaskServiceContext } from "./task-service";

export interface CreateTaskRoutesParameters {
  taskService: TaskService;
}

// Each route splits its operation's request schema by where the fields arrive: the id in the path,
// everything else in the body. The service validates the merged request.
const createTaskBody = createTaskRequestSchema;
const getTaskParams = getTaskRequestSchema;
const updateTaskParams = updateTaskRequestSchema.pick({ id: true });
const updateTaskBody = updateTaskRequestSchema.omit({ id: true });
const deleteTaskParams = deleteTaskRequestSchema;

const contextOf = (c: Context<AppEnv>): TaskServiceContext => ({ logger: c.var.scope.logger });

/**
 * Mounted by the app under `/tasks`. Handlers translate HTTP to service calls and back. Responses are
 * parsed with their schema, which strips every field the schema does not name.
 */
export function createTaskRoutes({ taskService }: CreateTaskRoutesParameters) {
  return {
    routes: new Hono<AppEnv>()
      .get("/", async (c) => c.json(listTasksResponseSchema.parse(await taskService.list({}, contextOf(c)))))
      .post("/", input("json", createTaskBody), async (c) =>
        c.json(createTaskResponseSchema.parse(await taskService.create(c.req.valid("json"), contextOf(c))), 201),
      )
      .get("/:id", input("param", getTaskParams), async (c) =>
        c.json(getTaskResponseSchema.parse(await taskService.get(c.req.valid("param"), contextOf(c)))),
      )
      .patch("/:id", input("param", updateTaskParams), input("json", updateTaskBody), async (c) => {
        // The path id wins over any id in the body.
        const request = { ...c.req.valid("json"), ...c.req.valid("param") };
        return c.json(updateTaskResponseSchema.parse(await taskService.update(request, contextOf(c))));
      })
      .delete("/:id", input("param", deleteTaskParams), async (c) =>
        c.json(deleteTaskResponseSchema.parse(await taskService.delete(c.req.valid("param"), contextOf(c)))),
      ),
  };
}

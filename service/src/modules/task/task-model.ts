import { z } from "zod";
import { NotFoundError } from "../../errors";

export type Task = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

const title = z.string().trim().min(1).max(200);
const description = z.string().max(2000);

// z.object strips unknown keys, so clients can't set id or timestamps.
export const createTaskBody = z.object({
  title,
  description: description.default(""),
});

export const updateTaskBody = z
  .object({ title, description })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

// Service inputs and outputs: one request object in, one response object out.
export type CreateTaskRequest = z.infer<typeof createTaskBody>;
export type GetTaskRequest = { id: string };
export type UpdateTaskRequest = { id: string } & z.infer<typeof updateTaskBody>;
export type DeleteTaskRequest = { id: string };
export type TaskResponse = { result: Task };
export type TasksResponse = { result: Task[] };

// Wire format. Hono's c.json is a plain JSON.stringify, so the fields that leave the service
// are picked explicitly here, and Dates become ISO strings.
const taskPayload = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const taskResponseSchema = z.object({ result: taskPayload });
export const tasksResponseSchema = z.object({ result: z.array(taskPayload) });

const toPayload = (task: Task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

export const toTaskResponse = ({ result }: TaskResponse) =>
  taskResponseSchema.parse({ result: toPayload(result) });

export const toTasksResponse = ({ result }: TasksResponse) =>
  tasksResponseSchema.parse({ result: result.map(toPayload) });

export class TaskNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Task ${id} not found`);
  }
}

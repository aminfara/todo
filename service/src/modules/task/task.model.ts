import { z } from "zod";

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
export const createTaskSchema = z.object({
  title,
  description: description.default(""),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({ title, description })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Output contract: the only fields that leave the service. Hono's c.json
// is a plain JSON.stringify, so we pick fields explicitly here.
export const taskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const toTaskResponse = (task: Task) =>
  taskResponseSchema.parse({
    id: task.id,
    title: task.title,
    description: task.description,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });

export class TaskNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`task ${id} not found`);
  }
}

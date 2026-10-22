import { z } from "zod";

export type Todo = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

const title = z.string().trim().min(1).max(200);
const description = z.string().max(2000);

// z.object strips unknown keys, so clients can't set id or timestamps.
export const createTodoSchema = z.object({
  title,
  description: description.default(""),
});
export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = z
  .object({ title, description })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

// Output contract: the only fields that leave the service. Hono's c.json
// is a plain JSON.stringify, so we pick fields explicitly here.
export const todoResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const toTodoResponse = (todo: Todo) =>
  todoResponseSchema.parse({
    id: todo.id,
    title: todo.title,
    description: todo.description,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  });

export class TodoNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`todo ${id} not found`);
  }
}

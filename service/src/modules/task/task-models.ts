import { z } from "zod";
import { idSchema, timestampsSchema } from "../../common-types";

// The domain model. Requests and responses are the inputs and outputs of the service operations;
// route handlers adapt HTTP to these types, never the other way around.

const titleSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().max(2000);

// Branded: only a parsed or generated id is a TaskId, so an unchecked string cannot reach the repo.
export const TASK_ID_PREFIX = "tsk";
export const taskIdSchema = idSchema.startsWith(TASK_ID_PREFIX).brand<"TaskId">();
export type TaskId = z.output<typeof taskIdSchema>;

export const taskSchema = z
  .object({
    id: taskIdSchema,
    title: titleSchema,
    description: descriptionSchema,
  })
  .extend(timestampsSchema.shape);

export type Task = z.infer<typeof taskSchema>;

// Every operation that returns one task returns the same shape.
const taskResponseSchema = z.object({ result: taskSchema });

// Each operation: request schema, response schema, then their types.

export const createTaskRequestSchema = taskSchema.pick({ title: true, description: true });
export const createTaskResponseSchema = taskResponseSchema;
export type CreateTaskRequest = z.input<typeof createTaskRequestSchema>;
export type CreateTaskResponse = z.output<typeof createTaskResponseSchema>;

export const getTaskRequestSchema = taskSchema.pick({ id: true });
export const getTaskResponseSchema = taskResponseSchema;
export type GetTaskRequest = z.input<typeof getTaskRequestSchema>;
export type GetTaskResponse = z.output<typeof getTaskResponseSchema>;

export const listTasksRequestSchema = z.object({});
export const listTasksResponseSchema = z.object({ result: z.array(taskSchema) });
export type ListTasksRequest = z.input<typeof listTasksRequestSchema>;
export type ListTasksResponse = z.output<typeof listTasksResponseSchema>;

export const updateTaskRequestSchema = taskSchema
  .pick({ id: true, title: true, description: true })
  .partial({ title: true, description: true });
export const updateTaskResponseSchema = taskResponseSchema;
export type UpdateTaskRequest = z.input<typeof updateTaskRequestSchema>;
export type UpdateTaskResponse = z.output<typeof updateTaskResponseSchema>;

export const deleteTaskRequestSchema = taskSchema.pick({ id: true });
export const deleteTaskResponseSchema = taskResponseSchema;
export type DeleteTaskRequest = z.input<typeof deleteTaskRequestSchema>;
export type DeleteTaskResponse = z.output<typeof deleteTaskResponseSchema>;

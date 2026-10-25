import { validate } from "../../validation";
import { EmptyTaskUpdateError } from "./task-errors";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
  type CreateTaskRequest,
  type Task,
  type TaskId,
  type UpdateTaskRequest,
} from "./task-models";

// Pure decisions about tasks: validation and the rules for creating and changing one. No I/O; the
// service supplies the id and time and does the reads and writes.

export interface NewTaskParameters {
  request: CreateTaskRequest;
  id: TaskId;
  at: Date;
}

export function newTask({ request, id, at }: NewTaskParameters): Task {
  const { title, description } = validate(createTaskRequestSchema, request);
  return { id, title, description, createdAt: at, updatedAt: at };
}

export type TaskChanges = Partial<Pick<Task, "title" | "description">>;

/** Validates an update request and keeps only the fields it actually changes. */
export function parseTaskUpdate(request: UpdateTaskRequest): { id: TaskId; changes: TaskChanges } {
  const { id, ...fields } = validate(updateTaskRequestSchema, request);
  // zod keeps an explicit `undefined` as a present key; it changes nothing, so it does not count.
  const changes = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  if (Object.keys(changes).length === 0) throw new EmptyTaskUpdateError();
  return { id, changes };
}

export interface TaskUpdatePatchParameters {
  changes: TaskChanges;
  at: Date;
}

/** The columns an update writes: the supplied changes and the new `updatedAt`. */
export function taskUpdatePatch({ changes, at }: TaskUpdatePatchParameters): TaskChanges & { updatedAt: Date } {
  return { ...changes, updatedAt: at };
}

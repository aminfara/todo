import type { Logger } from "../../logger";
import { validate } from "../../validation";
import { getUniqueId } from "../../id";
import { newTask, parseTaskUpdate, taskUpdatePatch } from "./task-domain";
import { TaskNotFoundError } from "./task-errors";
import {
  TASK_ID_PREFIX,
  taskIdSchema,
  deleteTaskRequestSchema,
  getTaskRequestSchema,
  listTasksRequestSchema,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type DeleteTaskRequest,
  type DeleteTaskResponse,
  type GetTaskRequest,
  type GetTaskResponse,
  type ListTasksRequest,
  type ListTasksResponse,
  type TaskId,
  type UpdateTaskRequest,
  type UpdateTaskResponse,
} from "./task-models";
import type { TaskRepo } from "./task-repo";

const newTaskId = () => taskIdSchema.parse(getUniqueId(TASK_ID_PREFIX));

/** Per-call information that is not part of a task. */
export interface TaskServiceContext {
  logger: Logger;
}

export interface CreateTaskServiceParameters {
  taskRepo: TaskRepo;
  /** Fallback when a call passes no context. */
  logger: Logger;
  newId?: () => TaskId;
  now?: () => Date;
}

/**
 * The task module's use cases. Every request is validated before any I/O: by the domain function
 * when one builds or changes a task (task-domain.ts), otherwise here.
 */
export function createTaskService({
  taskRepo,
  logger,
  newId = newTaskId,
  now = () => new Date(),
}: CreateTaskServiceParameters) {
  const defaultContext: TaskServiceContext = { logger };

  return {
    async list(
      request: ListTasksRequest = {},
      _context = defaultContext,
    ): Promise<ListTasksResponse> {
      validate(listTasksRequestSchema, request);
      return { result: await taskRepo.list() };
    },

    async get(request: GetTaskRequest, _context = defaultContext): Promise<GetTaskResponse> {
      const { id } = validate(getTaskRequestSchema, request);
      const task = await taskRepo.get({ id });
      if (!task) throw new TaskNotFoundError(id);
      return { result: task };
    },

    async create(
      request: CreateTaskRequest,
      context = defaultContext,
    ): Promise<CreateTaskResponse> {
      const task = newTask({ request, id: newId(), at: now() });
      await taskRepo.insert({ task });
      context.logger.info({ taskId: task.id }, "Task created");
      return { result: task };
    },

    async update(
      request: UpdateTaskRequest,
      context = defaultContext,
    ): Promise<UpdateTaskResponse> {
      const { id, changes } = parseTaskUpdate(request);
      const task = await taskRepo.update({ id, changes: taskUpdatePatch({ changes, at: now() }) });
      if (!task) throw new TaskNotFoundError(id);
      context.logger.info({ taskId: id, fields: Object.keys(changes) }, "Task updated");
      return { result: task };
    },

    async delete(
      request: DeleteTaskRequest,
      context = defaultContext,
    ): Promise<DeleteTaskResponse> {
      const { id } = validate(deleteTaskRequestSchema, request);
      const task = await taskRepo.delete({ id });
      if (!task) throw new TaskNotFoundError(id);
      context.logger.info({ taskId: id }, "Task deleted");
      return { result: task };
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;

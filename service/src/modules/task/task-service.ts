import {
  TaskNotFoundError,
  type CreateTaskRequest,
  type DeleteTaskRequest,
  type GetTaskRequest,
  type TaskResponse,
  type TasksResponse,
  type UpdateTaskRequest,
} from "./task-model";
import type { TaskRepo } from "./task-repo";

export interface CreateTaskServiceParameters {
  taskRepo: TaskRepo;
  newId?: () => string;
  now?: () => Date;
}

export function createTaskService({
  taskRepo,
  newId = () => crypto.randomUUID(),
  now = () => new Date(),
}: CreateTaskServiceParameters) {
  const getOrThrow = async ({ id }: GetTaskRequest) => {
    const task = await taskRepo.get({ id });
    if (!task) throw new TaskNotFoundError(id);
    return task;
  };

  return {
    async list(): Promise<TasksResponse> {
      return { result: await taskRepo.list() };
    },

    async get(request: GetTaskRequest): Promise<TaskResponse> {
      return { result: await getOrThrow(request) };
    },

    async create(request: CreateTaskRequest): Promise<TaskResponse> {
      const at = now();
      const task = { id: newId(), ...request, createdAt: at, updatedAt: at };
      await taskRepo.save({ task });
      return { result: task };
    },

    async update({ id, ...changes }: UpdateTaskRequest): Promise<TaskResponse> {
      const task = { ...(await getOrThrow({ id })), ...changes, updatedAt: now() };
      await taskRepo.save({ task });
      return { result: task };
    },

    async delete({ id }: DeleteTaskRequest): Promise<void> {
      if (!(await taskRepo.delete({ id }))) throw new TaskNotFoundError(id);
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;

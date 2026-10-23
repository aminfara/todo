import { BadRequestError } from "../../errors";
import { getUniqueId } from "../../id";
import { TaskNotFoundError } from "./task-errors";
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskRequest,
  DeleteTaskResponse,
  GetTaskRequest,
  GetTaskResponse,
  ListTasksRequest,
  ListTasksResponse,
  UpdateTaskRequest,
  UpdateTaskResponse,
} from "./task-models";
import type { TaskRepo } from "./task-repo";

export interface CreateTaskServiceParameters {
  taskRepo: TaskRepo;
  newId?: () => string;
  now?: () => Date;
}

export function createTaskService({
  taskRepo,
  newId = () => getUniqueId("tsk"),
  now = () => new Date(),
}: CreateTaskServiceParameters) {
  const getOrThrow = async ({ id }: GetTaskRequest) => {
    const task = await taskRepo.get({ id });
    if (!task) throw new TaskNotFoundError(id);
    return task;
  };

  return {
    async list(_request: ListTasksRequest = {}): Promise<ListTasksResponse> {
      return { result: await taskRepo.list() };
    },

    async get(request: GetTaskRequest): Promise<GetTaskResponse> {
      return { result: await getOrThrow(request) };
    },

    async create(request: CreateTaskRequest): Promise<CreateTaskResponse> {
      const at = now();
      const task = { id: newId(), ...request, createdAt: at, updatedAt: at };
      await taskRepo.save({ task });
      return { result: task };
    },

    async update({ id, ...changes }: UpdateTaskRequest): Promise<UpdateTaskResponse> {
      if (Object.keys(changes).length === 0) {
        throw new BadRequestError("An update needs at least one of title or description");
      }
      const task = { ...(await getOrThrow({ id })), ...changes, updatedAt: now() };
      await taskRepo.save({ task });
      return { result: task };
    },

    async delete(request: DeleteTaskRequest): Promise<DeleteTaskResponse> {
      const task = await taskRepo.delete(request);
      if (!task) throw new TaskNotFoundError(request.id);
      return { result: task };
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;

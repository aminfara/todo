import {
  TaskNotFoundError,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from "./task.model";
import type { TaskRepo } from "./task.repo";

type Deps = {
  repo: TaskRepo;
  newId?: () => string;
  now?: () => Date;
};

export const createTaskService = ({
  repo,
  newId = () => crypto.randomUUID(),
  now = () => new Date(),
}: Deps) => {
  const getOrThrow = (id: string): Task => {
    const task = repo.get(id);
    if (!task) throw new TaskNotFoundError(id);
    return task;
  };

  return {
    list: () => repo.list(),
    get: getOrThrow,
    create(input: CreateTaskInput): Task {
      const at = now();
      const task = { id: newId(), ...input, createdAt: at, updatedAt: at };
      repo.save(task);
      return task;
    },
    update(id: string, input: UpdateTaskInput): Task {
      const updated = { ...getOrThrow(id), ...input, updatedAt: now() };
      repo.save(updated);
      return updated;
    },
    delete(id: string): void {
      if (!repo.delete(id)) throw new TaskNotFoundError(id);
    },
  };
};

export type TaskService = ReturnType<typeof createTaskService>;

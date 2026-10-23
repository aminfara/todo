import type { Task } from "./task-model";

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(request: { id: string }): Promise<Task | undefined>;
  save(request: { task: Task }): Promise<void>;
  delete(request: { id: string }): Promise<boolean>;
  dispose?(): Promise<void>;
}

export function createInMemoryTaskRepo(): TaskRepo {
  const tasks = new Map<string, Task>();
  return {
    list: async () => [...tasks.values()],
    get: async ({ id }) => tasks.get(id),
    save: async ({ task }) => void tasks.set(task.id, task),
    delete: async ({ id }) => tasks.delete(id),
    dispose: async () => tasks.clear(),
  };
}

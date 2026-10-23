import type { Task } from "./task-models";

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(request: { id: string }): Promise<Task | undefined>;
  save(request: { task: Task }): Promise<void>;
  /** Returns the removed task, or undefined when there was none. */
  delete(request: { id: string }): Promise<Task | undefined>;
  dispose?(): Promise<void>;
}

export function createInMemoryTaskRepo(): TaskRepo {
  const tasks = new Map<string, Task>();
  return {
    list: async () => [...tasks.values()],
    get: async ({ id }) => tasks.get(id),
    save: async ({ task }) => void tasks.set(task.id, task),
    delete: async ({ id }) => {
      const task = tasks.get(id);
      tasks.delete(id);
      return task;
    },
    dispose: async () => tasks.clear(),
  };
}

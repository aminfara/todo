import type { Task } from "./task.model";

export type TaskRepo = {
  list(): Task[];
  get(id: string): Task | undefined;
  save(task: Task): void;
  delete(id: string): boolean;
};

export const createInMemoryTaskRepo = (): TaskRepo => {
  const tasks = new Map<string, Task>();
  return {
    list: () => [...tasks.values()],
    get: (id) => tasks.get(id),
    save: (task) => void tasks.set(task.id, task),
    delete: (id) => tasks.delete(id),
  };
};

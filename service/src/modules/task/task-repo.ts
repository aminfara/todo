import type { Task, TaskId } from "./task-models";

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(request: { id: TaskId }): Promise<Task | undefined>;
  save(request: { task: Task }): Promise<void>;
  /** Returns the removed task, or undefined when there was none. */
  delete(request: { id: TaskId }): Promise<Task | undefined>;
  dispose?(): Promise<void>;
}

/** Copies on the way in and out, like a database would, so callers never share the stored object. */
export function createInMemoryTaskRepo(): TaskRepo {
  const tasks = new Map<TaskId, Task>();
  const copy = (task: Task | undefined) => task && structuredClone(task);
  return {
    list: async () => [...tasks.values()].map((task) => structuredClone(task)),
    get: async ({ id }) => copy(tasks.get(id)),
    save: async ({ task }) => void tasks.set(task.id, structuredClone(task)),
    delete: async ({ id }) => {
      const task = tasks.get(id);
      tasks.delete(id);
      return copy(task);
    },
    dispose: async () => tasks.clear(),
  };
}

import type { Todo } from "./todo.model";

export type TodoRepo = {
  list(): Todo[];
  get(id: string): Todo | undefined;
  save(todo: Todo): void;
  delete(id: string): boolean;
};

export const createInMemoryTodoRepo = (): TodoRepo => {
  const todos = new Map<string, Todo>();
  return {
    list: () => [...todos.values()],
    get: (id) => todos.get(id),
    save: (todo) => void todos.set(todo.id, todo),
    delete: (id) => todos.delete(id),
  };
};

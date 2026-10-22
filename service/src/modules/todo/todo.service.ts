import {
  TodoNotFoundError,
  type CreateTodoInput,
  type Todo,
  type UpdateTodoInput,
} from "./todo.model";
import type { TodoRepo } from "./todo.repo";

type Deps = {
  repo: TodoRepo;
  newId?: () => string;
  now?: () => Date;
};

export const createTodoService = ({
  repo,
  newId = () => crypto.randomUUID(),
  now = () => new Date(),
}: Deps) => {
  const getOrThrow = (id: string): Todo => {
    const todo = repo.get(id);
    if (!todo) throw new TodoNotFoundError(id);
    return todo;
  };

  return {
    list: () => repo.list(),
    get: getOrThrow,
    create(input: CreateTodoInput): Todo {
      const at = now();
      const todo = { id: newId(), ...input, createdAt: at, updatedAt: at };
      repo.save(todo);
      return todo;
    },
    update(id: string, input: UpdateTodoInput): Todo {
      const updated = { ...getOrThrow(id), ...input, updatedAt: now() };
      repo.save(updated);
      return updated;
    },
    delete(id: string): void {
      if (!repo.delete(id)) throw new TodoNotFoundError(id);
    },
  };
};

export type TodoService = ReturnType<typeof createTodoService>;

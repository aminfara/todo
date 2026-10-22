import { createTodoHandler } from "./todo.handler";
import { createInMemoryTodoRepo, type TodoRepo } from "./todo.repo";
import { createTodoService } from "./todo.service";

export { TodoNotFoundError } from "./todo.model";

// Public API of the todo module.
export const createTodoModule = (repo: TodoRepo = createInMemoryTodoRepo()) =>
  createTodoHandler(createTodoService({ repo }));

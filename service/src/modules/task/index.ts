import { createTaskHandler } from "./task.handler";
import { createInMemoryTaskRepo, type TaskRepo } from "./task.repo";
import { createTaskService } from "./task.service";

export { TaskNotFoundError } from "./task.model";

// Public API of the task module.
export const createTaskModule = (repo: TaskRepo = createInMemoryTaskRepo()) =>
  createTaskHandler(createTaskService({ repo }));

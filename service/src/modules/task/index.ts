// Public API of the task module. Code outside `modules/task/` imports only from here.
export { createInMemoryTaskRepo, type TaskRepo } from "./task-repo";
export { createTaskRoutes } from "./task-routes";
export { createTaskService, type TaskService } from "./task-service";

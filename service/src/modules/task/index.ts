// Public API of the task module. Code outside `modules/task/` imports only from here, except the
// browser, which imports task-contracts.ts through src/contracts.ts.
export * from "./task-contracts";
export { createInMemoryTaskRepo, type TaskRepo } from "./task-repo";
export { createTaskRoutes } from "./task-routes";
export { createTaskService, type TaskService, type TaskServiceContext } from "./task-service";

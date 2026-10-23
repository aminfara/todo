import { loadConfig, type Config } from "./config";
import { createLogger, type Logger } from "./logger";
import {
  createInMemoryTaskRepo,
  createTaskRoutes,
  createTaskService,
  type TaskRepo,
  type TaskService,
} from "./modules/task";

/** Per-request dependencies. Add anything that must not outlive one request (current user, ...). */
export interface RequestScope {
  requestId: string;
  logger: Logger;
  dispose(): Promise<void>;
}

export type ContainerOverrides = Partial<{
  config: Config;
  logger: Logger;
  taskRepo: TaskRepo;
  taskService: TaskService;
}>;

/**
 * Composition root. Wiring is plain code, so the dependency graph is readable top to bottom and
 * costs nothing at runtime. Pass overrides to swap a module for a test or another environment.
 *
 * The container disposes what it created, in reverse order, and leaves overrides to their owner.
 */
export function createContainer(overrides: ContainerOverrides = {}) {
  const disposers: Array<() => Promise<void>> = [];
  const own = <T extends object>(module: T): T => {
    const { dispose } = module as { dispose?: () => Promise<void> };
    if (dispose) disposers.unshift(dispose);
    return module;
  };

  const config = overrides.config ?? loadConfig();
  const logger = overrides.logger ?? createLogger({ config });
  const taskRepo = overrides.taskRepo ?? own(createInMemoryTaskRepo());
  const taskService = overrides.taskService ?? own(createTaskService({ taskRepo }));
  const taskRoutes = own(createTaskRoutes({ taskService }));

  return {
    config,
    logger,
    taskRepo,
    taskService,
    taskRoutes,

    createRequestScope({ requestId }: { requestId: string }): RequestScope {
      return {
        requestId,
        logger: logger.child({ requestId }),
        dispose: async () => {},
      };
    },

    async dispose() {
      for (const dispose of disposers) {
        try {
          await dispose();
        } catch (error) {
          logger.error({ err: error }, "Failed to dispose a module");
        }
      }
    },
  };
}

export type Container = ReturnType<typeof createContainer>;

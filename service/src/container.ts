import { loadConfig, type Config } from "./config";
import { connectDatabase, type ConnectDatabaseParameters, type Database } from "./database";
import { createLogger, type Logger } from "./logger";
import {
  createDrizzleTaskRepo,
  createTaskRoutes,
  createTaskService,
  type TaskRepo,
  type TaskService,
} from "./modules/task";
import type { RequestScope } from "./request-scope";

export type ContainerOverrides = Partial<{
  config: Config;
  logger: Logger;
  /** Replaces how the container connects; the container still owns and disposes the result. */
  connectDatabase: (parameters: ConnectDatabaseParameters) => Promise<Database>;
  database: Database;
  taskRepo: TaskRepo;
  taskService: TaskService;
}>;

/**
 * Composition root. Wiring is plain code, so the dependency graph is readable top to bottom and
 * costs nothing at runtime. Pass overrides to swap a module for a test or another environment.
 *
 * The container disposes what it created, in reverse order, and leaves overrides to their owner.
 */
export async function createContainer(overrides: ContainerOverrides = {}) {
  // Disposes in reverse order of registration, and still runs the rest when one throws.
  const disposables = new AsyncDisposableStack();
  const own = <T extends object>(module: T): T => {
    const { dispose } = module as { dispose?: () => Promise<void> };
    if (dispose) disposables.defer(dispose);
    return module;
  };

  try {
    const config = overrides.config ?? loadConfig();
    const logger = overrides.logger ?? createLogger({ config });
    const connect = overrides.connectDatabase ?? connectDatabase;
    // Production never migrates on start: `bun run db:migrate` does that once per release.
    const migrations = config.env === "production" ? "require" : "apply";
    const database = overrides.database ?? own(await connect({ url: config.databaseUrl, migrations }));
    const taskRepo = overrides.taskRepo ?? own(createDrizzleTaskRepo({ db: database.db }));
    const taskService = overrides.taskService ?? own(createTaskService({ taskRepo, logger }));
    const taskRoutes = createTaskRoutes({ taskService });

    return {
      config,
      logger,
      database,
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

      /** Rejects with the first failure (a SuppressedError when several fail) after trying them all. */
      async dispose() {
        await disposables.disposeAsync();
      },
    };
  } catch (err) {
    // Wiring failed after something opened: release it, and report the wiring error, not the cleanup's.
    await disposables.disposeAsync().catch(() => {});
    throw err;
  }
}

export type Container = Awaited<ReturnType<typeof createContainer>>;

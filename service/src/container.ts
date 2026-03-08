import { loadConfig, type Config } from "@/config.js";
import { setupLogger, type Logger } from "@/logger.js";
import { createRootRoutes, type RootRoutes } from "@/modules/root/root-routes.js";
import { createRootService, type RootService } from "@/modules/root/root-service.js";
import { diContainer, fastifyAwilixPlugin } from "@fastify/awilix";
import { asFunction } from "awilix";
import type { FastifyInstance } from "fastify";

declare module "@fastify/awilix" {
  interface Cradle {
    config: Config;
    logger: Logger;
    rootRoutes: RootRoutes;
    rootService: RootService;
  }
  // interface RequestCradle {} <- for later use if you want to add request-scoped dependencies
}

// Setup the dependency injection container (root container)
export function setupDiContainer() {
  diContainer.register({
    config: asFunction(loadConfig).singleton(),
    logger: asFunction(setupLogger).singleton(),
    rootService: asFunction(createRootService)
      .singleton()
      .disposer(async (module) => await module.dispose()),
    rootRoutes: asFunction(createRootRoutes)
      .singleton()
      .disposer(async (module) => await module.dispose()),
  });
}

interface SetupDiContainerParams {
  fastify: FastifyInstance;
}

// Setup the scoped dependency injection container for each request
export function setupScopedDiContainer({ fastify }: SetupDiContainerParams) {
  fastify.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });

  fastify.addHook("onRequest", (req, _res, done) => {
    fastify.log.debug("Setting up scoped DI container for each request");
    req.diScope.register({
      // Register request-scoped dependencies here
    });

    done();
  });
}

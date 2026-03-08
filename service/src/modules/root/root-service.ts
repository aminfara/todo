import pkg from "@/../package.json" with { type: "json" };
import type { Config } from "@/config.js";
import type { Logger } from "@/logger.js";
import type { GetInfoRequest, GetInfoResponse } from "@/modules/root/root-models.js";

export interface CreateRootServiceParams {
  config: Config;
  logger: Logger;
}

export function createRootService({ config, logger }: CreateRootServiceParams) {
  logger.debug("Initializing root service");

  return {
    async getInfo(request: GetInfoRequest): Promise<GetInfoResponse> {
      const result = {
        name: "Todos API",
        version: pkg.version,
        description: "A simple API for managing todos",
      } as GetInfoResponse["result"];

      if (request.verbose) {
        logger.debug({ verbose: request.verbose }, "Root service info requested with verbose mode");
        result.environment = config.env;
        result.uptime = process.uptime();
      }

      return { result };
    },

    async dispose() {
      logger.debug("Disposing root service");
    },
  };
}

export type RootService = ReturnType<typeof createRootService>;

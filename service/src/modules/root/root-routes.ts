import type { Logger } from "@/logger.js";
import { getInfoRequest, getInfoResponse } from "@/modules/root/root-models.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import status from "http-status";

export interface CreateRootRoutesParams {
  logger: Logger;
}

export function createRootRoutes({ logger }: CreateRootRoutesParams) {
  logger.debug("Initializing root routes");

  return {
    plugin: (async (fastify, _opts) => {
      fastify.get("/", {
        schema: {
          querystring: getInfoRequest,
          response: {
            [status.OK]: getInfoResponse,
          },
        },
        handler: async (req, res) => {
          const { rootService } = req.diScope.cradle;
          const info = await rootService.getInfo(req.query);
          res.status(status.OK).send(info);
        },
      });
    }) as FastifyPluginAsyncZod,

    dispose: async () => {
      logger.debug("Disposing root routes");
    },
  };
}

export type RootRoutes = ReturnType<typeof createRootRoutes>;

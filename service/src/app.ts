import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import type { ErrorResponse } from "./error-contracts";
import { AppError, NotFoundError, toErrorCode, type ErrorDetails } from "./errors";
import type { Container } from "./container";
import { requestScope, type AppEnv } from "./request-scope";

export interface CreateAppParameters {
  container: Container;
}

// Explicit pick: never spread an Error, its own properties (name, cause, stack) are not API.
const errorBody = (
  c: { get(key: "requestId"): string },
  statusCode: number,
  { message, details }: { message: string; details?: ErrorDetails },
) => ({
  error: { code: toErrorCode(statusCode), message, details, requestId: c.get("requestId") },
} satisfies ErrorResponse);

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error";

export function createApp({ container }: CreateAppParameters) {
  return new Hono<AppEnv>()
    .use(cors({ origin: container.config.corsOrigin }))
    .use(requestId())
    .use(requestScope(container.createRequestScope))
    .route("/tasks", container.taskRoutes.routes)
    .notFound((c) => {
      const error = new NotFoundError(`Route ${c.req.method} ${c.req.path} not found`);
      c.get("scope").logger.warn({ err: error }, error.message);
      return c.json(errorBody(c, error.statusCode, error), error.statusCode);
    })
    // Boundary: the only place errors are logged and turned into responses.
    .onError((err, c) => {
      const { logger } = c.get("scope");

      if (err instanceof AppError) {
        // Client errors are warnings, our own failures are errors.
        const log = err.statusCode >= 500 ? logger.error : logger.warn;
        log.call(logger, { err }, err.message);
        // A 5xx message describes our internals, so clients never see it.
        const body = err.statusCode >= 500 ? { message: INTERNAL_SERVER_ERROR_MESSAGE } : err;
        return c.json(errorBody(c, err.statusCode, body), err.statusCode);
      }

      // Thrown by Hono itself, e.g. malformed JSON in the request body.
      if (err instanceof HTTPException) {
        const log = err.status >= 500 ? logger.error : logger.warn;
        log.call(logger, { err }, err.message);
        return c.json(errorBody(c, err.status, err), err.status);
      }

      logger.error({ err }, "Unhandled error");
      return c.json(errorBody(c, 500, { message: INTERNAL_SERVER_ERROR_MESSAGE }), 500);
    });
}

export type AppType = ReturnType<typeof createApp>;

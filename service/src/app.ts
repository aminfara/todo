import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError, NotFoundError } from "./errors";
import type { Container } from "./container";
import { requestScope, type AppEnv } from "./request-scope";

export interface CreateAppParameters {
  container: Container;
}

// Explicit pick: never spread an Error, its own properties (name, cause, stack) are not API.
const errorBody = (
  c: { get(key: "requestId"): string },
  { code, message, details }: { code: string; message: string; details?: unknown },
) => ({ error: { code, message, details, requestId: c.get("requestId") } });

export function createApp({ container }: CreateAppParameters) {
  return new Hono<AppEnv>()
    .use(cors())
    .use(requestId())
    .use(requestScope(container))
    .route("/tasks", container.taskRoutes.routes)
    .notFound((c) => {
      const error = new NotFoundError(`Route ${c.req.method} ${c.req.path} not found`);
      return c.json(errorBody(c, error), error.statusCode);
    })
    // Boundary: the only place errors are logged and turned into responses.
    .onError((err, c) => {
      const { logger } = c.get("scope");

      if (err instanceof AppError) {
        const log = err.statusCode >= 500 ? logger.error : logger.debug;
        log.call(logger, { err }, err.message);
        return c.json(errorBody(c, err), err.statusCode);
      }

      // Thrown by Hono itself, e.g. malformed JSON in the request body.
      if (err instanceof HTTPException) {
        logger.debug({ err }, err.message);
        const code = err.status === 400 ? "bad_request" : "http_error";
        return c.json(errorBody(c, { code, message: err.message }), err.status as ContentfulStatusCode);
      }

      logger.error({ err }, "Unhandled error");
      return c.json(errorBody(c, { code: "internal_error", message: "Internal Server Error" }), 500);
    });
}

export type AppType = ReturnType<typeof createApp>;

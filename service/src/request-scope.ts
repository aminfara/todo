import { createMiddleware } from "hono/factory";
import type { Logger } from "./logger";

/** Per-request dependencies. Add anything that must not outlive one request (current user, ...). */
export interface RequestScope {
  requestId: string;
  logger: Logger;
  dispose(): Promise<void>;
}

export type AppEnv = { Variables: { scope: RequestScope } };

/**
 * Creates a RequestScope for each request, logs the request when it completes, and disposes the
 * scope afterwards. Must run after hono/request-id.
 */
export const requestScope = (createScope: (parameters: { requestId: string }) => RequestScope) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const scope = createScope({ requestId: c.get("requestId") });
    c.set("scope", scope);
    const start = performance.now();
    try {
      await next();
    } finally {
      scope.logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: Math.round(performance.now() - start),
        },
        "request completed",
      );
      await scope.dispose();
    }
  });

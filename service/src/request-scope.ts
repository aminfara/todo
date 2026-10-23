import { createMiddleware } from "hono/factory";
import type { Container, RequestScope } from "./container";

export type AppEnv = { Variables: { scope: RequestScope } };

/**
 * Creates a RequestScope for each request, logs the request when it completes, and disposes the
 * scope afterwards. Must run after hono/request-id.
 */
export const requestScope = (container: Pick<Container, "createRequestScope">) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const scope = container.createRequestScope({ requestId: c.get("requestId") });
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

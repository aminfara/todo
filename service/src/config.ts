import { z } from "zod";
import { InternalServerError } from "./errors";

const configSchema = z
  .object({
    env: z.enum(["development", "production", "test"]),
    logLevel: z.enum(["debug", "info", "warn", "error"]),
    host: z.string().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    corsOrigin: z.url({ protocol: /^https?$/ }).refine((value) => URL.canParse(value) && new URL(value).origin === value, "must be an origin"),
    databaseUrl: z.url({ protocol: /^postgres(ql)?$/ }),
  })
  .readonly(); // parse() returns a frozen object

export type Config = z.infer<typeof configSchema>;

export class ConfigValidationError extends InternalServerError {
  constructor(options?: ErrorOptions) {
    super("Failed to validate configuration from environment variables", options);
  }
}

export interface LoadConfigParameters {
  env?: Record<string, string | undefined>;
}

/**
 * Loads and validates configuration. Every value is mandatory: the environment decides, the code
 * has no defaults. Bun loads `.env` files into `process.env` on its own, so no dotenv step is needed.
 */
export function loadConfig({ env = process.env }: LoadConfigParameters = {}): Config {
  const result = configSchema.safeParse({
    env: env["NODE_ENV"],
    logLevel: env["TASKTOGETHER_LOG_LEVEL"],
    host: env["TASKTOGETHER_HOST"],
    port: env["PORT"],
    corsOrigin: env["TASKTOGETHER_CORS_ORIGIN"],
    databaseUrl: env["TASKTOGETHER_DATABASE_URL"],
  });
  if (!result.success) throw new ConfigValidationError({ cause: result.error });
  return result.data;
}

/** Allow-list of fields that are safe to log. `databaseUrl` stays out: it holds the password. */
export function getPrintableConfig(config: Config): Partial<Config> {
  return {
    env: config.env,
    logLevel: config.logLevel,
    host: config.host,
    port: config.port,
    corsOrigin: config.corsOrigin,
  };
}

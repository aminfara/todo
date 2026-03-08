import { TodosError, type TodosErrorOptions } from "@/errors.js";
import z from "zod";

export class ConfigValidationError extends TodosError {
  constructor(options?: Omit<TodosErrorOptions, "statusCode">) {
    super("Failed to validate configuration from environment variables.", options);
  }
}

const configSchema = z
  .object({
    env: z.enum(["development", "production", "test"]),
  })
  .readonly(); // make the config object immutable

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  try {
    return configSchema.parse({
      env: process.env["NODE_ENV"],
    });
  } catch (error) {
    throw new ConfigValidationError({ cause: error instanceof Error ? error : undefined });
  }
}

export function getPrintableConfig(config: Config): Partial<Config> {
  return {
    env: config.env,
  };
}

import type { Config } from "@/config.js";
import { pino, type LoggerOptions } from "pino";

export interface SetupLoggerParams {
  config: Config;
}

export function setupLogger({ config }: SetupLoggerParams) {
  let loggerOptions: LoggerOptions;
  switch (config.env) {
    case "development": {
      loggerOptions = {
        level: config.logLevel,
        transport: {
          target: "pino-pretty",
          options: {
            translateTime: "SYS:standard",
            ignore: "hostname",
          },
        },
      };
      break;
    }
    case "production": {
      loggerOptions = {
        level: config.logLevel,
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      };
      break;
    }
    case "test": {
      loggerOptions = {
        enabled: false,
      };
      break;
    }
  }

  const logger = pino(loggerOptions);
  logger.debug({ loglevel: config.logLevel }, "Logger initialized with configuration");

  return logger;
}

export type Logger = ReturnType<typeof setupLogger>;

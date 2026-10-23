import { pino, type LoggerOptions } from "pino";
import type { Config } from "./config";

export type Logger = pino.Logger;

export interface CreateLoggerParameters {
  config: Config;
}

export function createLogger({ config }: CreateLoggerParameters): Logger {
  const options: LoggerOptions = {
    development: {
      level: config.logLevel,
      transport: {
        target: "pino-pretty",
        options: { translateTime: "SYS:standard", ignore: "pid,hostname" },
      },
    },
    production: { level: config.logLevel, timestamp: pino.stdTimeFunctions.isoTime },
    test: { level: "silent" },
  }[config.env];

  return pino(options);
}

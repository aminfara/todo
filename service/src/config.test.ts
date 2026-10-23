import { describe, expect, test } from "bun:test";
import { ConfigValidationError, getPrintableConfig, loadConfig } from "./config";
import { InternalServerError } from "./errors";

describe("loadConfig", () => {
  test("falls back to defaults when nothing is set", () => {
    expect(loadConfig({ env: {} })).toEqual({
      env: "development",
      logLevel: "info",
      host: "localhost",
      port: 3001,
    });
  });

  test("reads and coerces values from the environment", () => {
    const config = loadConfig({
      env: {
        NODE_ENV: "production",
        TASKTOGETHER_LOG_LEVEL: "warn",
        TASKTOGETHER_HOST: "0.0.0.0",
        PORT: "8080",
      },
    });

    expect(config).toEqual({ env: "production", logLevel: "warn", host: "0.0.0.0", port: 8080 });
  });

  test("returns an immutable object", () => {
    expect(Object.isFrozen(loadConfig({ env: {} }))).toBe(true);
  });

  test.each([
    ["unknown log level", { TASKTOGETHER_LOG_LEVEL: "loud" }],
    ["unknown environment", { NODE_ENV: "staging" }],
    ["port above 65535", { PORT: "70000" }],
    ["non-numeric port", { PORT: "abc" }],
  ])("throws ConfigValidationError for %s", (_name, env) => {
    expect(() => loadConfig({ env })).toThrow(ConfigValidationError);
    expect(() => loadConfig({ env })).toThrow(InternalServerError);
  });
});

describe("getPrintableConfig", () => {
  test("only exposes allow-listed fields", () => {
    const config = { ...loadConfig({ env: {} }), secret: "s3cr3t" };

    expect(getPrintableConfig(config)).not.toHaveProperty("secret");
    expect(getPrintableConfig(config)).toHaveProperty("port", 3001);
  });
});

import { describe, expect, test } from "bun:test";
import { ConfigValidationError, getPrintableConfig, loadConfig } from "./config";
import { InternalServerError } from "./errors";

const validEnv = {
  NODE_ENV: "production",
  TASKTOGETHER_LOG_LEVEL: "warn",
  TASKTOGETHER_HOST: "0.0.0.0",
  PORT: "8080",
};

describe("loadConfig", () => {
  test("reads and coerces values from the environment", () => {
    expect(loadConfig({ env: validEnv })).toEqual({
      env: "production",
      logLevel: "warn",
      host: "0.0.0.0",
      port: 8080,
    });
  });

  test("returns an immutable object", () => {
    expect(Object.isFrozen(loadConfig({ env: validEnv }))).toBe(true);
  });

  test.each(Object.keys(validEnv))("requires %s to be set", (name) => {
    const { [name]: _omitted, ...env } = validEnv as Record<string, string>;

    expect(() => loadConfig({ env })).toThrow(ConfigValidationError);
  });

  test.each([
    ["unknown log level", { TASKTOGETHER_LOG_LEVEL: "loud" }],
    ["unknown environment", { NODE_ENV: "staging" }],
    ["port above 65535", { PORT: "70000" }],
    ["non-numeric port", { PORT: "abc" }],
    ["empty host", { TASKTOGETHER_HOST: "" }],
  ])("throws ConfigValidationError for %s", (_name, override) => {
    const env = { ...validEnv, ...override };

    expect(() => loadConfig({ env })).toThrow(ConfigValidationError);
    expect(() => loadConfig({ env })).toThrow(InternalServerError);
  });
});

describe("getPrintableConfig", () => {
  test("only exposes allow-listed fields", () => {
    const config = { ...loadConfig({ env: validEnv }), secret: "s3cr3t" };

    expect(getPrintableConfig(config)).not.toHaveProperty("secret");
    expect(getPrintableConfig(config)).toHaveProperty("port", 8080);
  });
});

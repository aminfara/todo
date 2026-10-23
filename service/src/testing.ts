import type { Config } from "./config";
import { createContainer, type ContainerOverrides } from "./container";

// Logger is silent when env is "test".
export const testConfig: Config = {
  env: "test",
  logLevel: "info",
  host: "localhost",
  port: 3001,
};

export const createTestContainer = (overrides: ContainerOverrides = {}) =>
  createContainer({ config: testConfig, ...overrides });

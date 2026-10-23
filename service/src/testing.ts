import type { Config } from "./config";
import { createContainer, type ContainerOverrides } from "./container";
import { createInMemoryTaskRepo } from "./modules/task";

// Logger is silent when env is "test".
export const testConfig: Config = {
  env: "test",
  logLevel: "info",
  host: "localhost",
  port: 3001,
};

// Repo is explicit, so tests stay fast and isolated even when production wires a database.
export const createTestContainer = (overrides: ContainerOverrides = {}) =>
  createContainer({
    config: testConfig,
    taskRepo: createInMemoryTaskRepo(),
    ...overrides,
  });

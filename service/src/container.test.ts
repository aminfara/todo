import { describe, expect, test } from "bun:test";
import { pino } from "pino";
import { createInMemoryTaskRepo } from "./modules/task/task-repo";
import { createTestContainer } from "./testing";

describe("createContainer", () => {
  test("wires the task service to the task repo", async () => {
    const container = createTestContainer();

    await container.taskService.create({ title: "wired", description: "" });

    expect(await container.taskRepo.list()).toHaveLength(1);
  });

  test("uses an overridden repo instead of creating one", async () => {
    const taskRepo = createInMemoryTaskRepo();
    const container = createTestContainer({ taskRepo });

    await container.taskService.create({ title: "x", description: "" });

    expect(container.taskRepo).toBe(taskRepo);
    expect(await taskRepo.list()).toHaveLength(1);
  });

  test("two containers do not share state", async () => {
    const a = createTestContainer();
    const b = createTestContainer();

    await a.taskService.create({ title: "x", description: "" });

    expect(await b.taskRepo.list()).toHaveLength(0);
  });
});

describe("dispose", () => {
  test("disposes modules the container created", async () => {
    const container = createTestContainer();
    await container.taskService.create({ title: "x", description: "" });

    await container.dispose();

    expect(await container.taskRepo.list()).toHaveLength(0);
  });

  test("leaves overridden modules to their owner", async () => {
    let disposed = false;
    const taskRepo = {
      ...createInMemoryTaskRepo(),
      dispose: async () => void (disposed = true),
    };
    const container = createTestContainer({ taskRepo });

    await container.dispose();

    expect(disposed).toBe(false);
  });
});

describe("createRequestScope", () => {
  test("gives a logger bound to the request id", () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const scope = createTestContainer({ logger }).createRequestScope({ requestId: "req-1" });

    scope.logger.info("hello");

    expect(JSON.parse(lines[0]!)).toMatchObject({ requestId: "req-1", msg: "hello" });
  });

  test("does not touch the app-level logger bindings", () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const container = createTestContainer({ logger });
    container.createRequestScope({ requestId: "req-1" });

    container.logger.info("app");

    expect(JSON.parse(lines[0]!)).not.toHaveProperty("requestId");
  });
});

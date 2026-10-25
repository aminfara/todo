import { describe, expect, test } from "bun:test";
import { pino } from "pino";
import type { Task } from "./modules/task";
import { tasks } from "./modules/task/task-schema";
import { createTestContainer, createTestDatabase, stubTaskRepo } from "./testing";

describe("createContainer", () => {
  test("uses an overridden repo instead of creating one", async () => {
    const saved: Task[] = [];
    const taskRepo = stubTaskRepo({ save: async ({ task }) => void saved.push(task) });
    const container = await createTestContainer({ taskRepo });

    await container.taskService.create({ title: "x", description: "" });

    expect(saved).toHaveLength(1);
    expect(await container.database.db.$count(tasks)).toBe(0);
  });

  test("stores tasks in the database it connects to", async () => {
    const container = await createTestContainer();

    await container.taskService.create({ title: "x", description: "" });

    expect(await container.database.db.$count(tasks)).toBe(1);
  });

  test("two test containers do not share a database", async () => {
    const a = await createTestContainer();
    const b = await createTestContainer();

    await a.taskService.create({ title: "x", description: "" });

    expect((await b.taskService.list()).result).toHaveLength(0);
  });
});

describe("dispose", () => {
  test("closes the database it connected", async () => {
    const container = await createTestContainer();

    await container.dispose();

    await expect(container.taskService.list()).rejects.toThrow();
  });

  test("leaves overridden modules to their owner", async () => {
    let disposed = false;
    const taskRepo = stubTaskRepo({ dispose: async () => void (disposed = true) });
    const database = await createTestDatabase();
    const container = await createTestContainer({ taskRepo, database });

    await container.dispose();

    expect(disposed).toBe(false);
    expect(await database.db.$count(tasks)).toBe(0);
  });
});

describe("createRequestScope", () => {
  test("gives a logger bound to the request id", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const scope = (await createTestContainer({ logger })).createRequestScope({ requestId: "req-1" });

    scope.logger.info("hello");

    expect(JSON.parse(lines[0]!)).toMatchObject({ requestId: "req-1", msg: "hello" });
  });

  test("does not touch the app-level logger bindings", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const container = await createTestContainer({ logger });
    container.createRequestScope({ requestId: "req-1" });

    container.logger.info("app");

    expect(JSON.parse(lines[0]!)).not.toHaveProperty("requestId");
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { pino } from "pino";
import { stubTaskRepo, type Task } from "./modules/task";
import { createTestContainer, createTestDatabase } from "./testing";

// Everything a test creates is disposed afterwards. Containers dispose their own database; a
// database a test passes in belongs to the test.
const cleanups: (() => Promise<void>)[] = [];
const containerFor = async (...parameters: Parameters<typeof createTestContainer>) => {
  const container = await createTestContainer(...parameters);
  cleanups.push(() => container.dispose());
  return container;
};
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe("createContainer", () => {
  test("uses an overridden repo instead of creating one", async () => {
    const saved: Task[] = [];
    const taskRepo = stubTaskRepo({ insert: async ({ task }) => void saved.push(task) });
    const container = await containerFor({ taskRepo });

    await container.taskService.create({ title: "x", description: "" });

    expect(saved).toHaveLength(1);
  });

  test("stores tasks in the database it connects to", async () => {
    const container = await containerFor();

    await container.taskService.create({ title: "x", description: "" });

    expect((await container.taskService.list()).result).toHaveLength(1);
  });

  test("two test containers do not share a database", async () => {
    const a = await containerFor();
    const b = await containerFor();

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
    cleanups.push(() => database.dispose());
    const container = await createTestContainer({ taskRepo, database });

    await container.dispose();

    expect(disposed).toBe(false);
    expect(await database.db.execute("select 1")).toBeDefined();
  });

  test("disposes what it already connected when wiring fails", async () => {
    let closed = false;
    const connectDatabase = async () => ({
      get db(): never {
        throw new Error("wiring failed");
      },
      dispose: async () => void (closed = true),
    });

    await expect(createTestContainer({ connectDatabase })).rejects.toThrow("wiring failed");

    expect(closed).toBe(true);
  });
});

describe("createRequestScope", () => {
  test("gives a logger bound to the request id", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const scope = (await containerFor({ logger })).createRequestScope({ requestId: "req-1" });

    scope.logger.info("hello");

    expect(JSON.parse(lines[0]!)).toMatchObject({ requestId: "req-1", msg: "hello" });
  });

  test("does not touch the app-level logger bindings", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const container = await containerFor({ logger });
    container.createRequestScope({ requestId: "req-1" });

    container.logger.info("app");

    expect(JSON.parse(lines[0]!)).not.toHaveProperty("requestId");
  });
});

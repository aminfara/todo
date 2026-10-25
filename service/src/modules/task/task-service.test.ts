import { afterAll, describe, expect, test } from "bun:test";
import { pino } from "pino";
import { ValidationError } from "../../validation";
import { EmptyTaskUpdateError, TaskNotFoundError } from "./task-errors";
import { taskIdSchema } from "./task-models";
import { createTestDatabase, resetDatabase } from "../../testing";
import { createDrizzleTaskRepo } from "./task-repo";
import { createTaskService } from "./task-service";

const idOf = (n: number) => taskIdSchema.parse(`tsk-${String(n).padStart(21, "0")}`);
const unknownId = idOf(999);

const database = await createTestDatabase();
afterAll(() => database.dispose());

const setup = async () => {
  await resetDatabase(database.db);
  const clock = { current: new Date("2026-01-01T00:00:00.000Z") };
  let issued = 0;
  const service = createTaskService({
    taskRepo: createDrizzleTaskRepo({ db: database.db }),
    logger: pino({ level: "silent" }),
    newId: () => idOf(++issued),
    now: () => clock.current,
  });
  return { service, clock };
};

// Validation and update rules are unit-tested in task-domain.test.ts; these tests cover the use
// cases: what is stored, what is returned, and the order of validation and lookup.

describe("create", () => {
  test("stores the task and returns it", async () => {
    const { service, clock } = await setup();

    const { result } = await service.create({ title: " Buy milk ", description: "2 litres" });

    expect(result).toEqual({
      id: idOf(1),
      title: "Buy milk",
      description: "2 litres",
      createdAt: clock.current,
      updatedAt: clock.current,
    });
    expect((await service.get({ id: result.id })).result).toEqual(result);
  });

  test("stores nothing when the request is invalid", async () => {
    const { service } = await setup();

    await expect(service.create({ title: "", description: "" })).rejects.toBeInstanceOf(ValidationError);

    expect((await service.list()).result).toEqual([]);
  });
});

describe("get", () => {
  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = await setup();

    await expect(service.get({ id: unknownId })).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  test("throws ValidationError for a malformed id", async () => {
    const { service } = await setup();

    await expect(service.get({ id: "nope" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("list", () => {
  test("returns tasks in creation order", async () => {
    const { service } = await setup();
    await service.create({ title: "first", description: "" });
    await service.create({ title: "second", description: "" });

    const { result } = await service.list();

    expect(result.map((task) => task.title)).toEqual(["first", "second"]);
  });
});

describe("update", () => {
  test("persists the change and moves updatedAt", async () => {
    const { service, clock } = await setup();
    const { result: created } = await service.create({ title: "a", description: "before" });
    clock.current = new Date("2026-01-02T00:00:00.000Z");

    await service.update({ id: created.id, description: "after" });

    const { result } = await service.get({ id: created.id });
    expect(result).toEqual({ ...created, description: "after", updatedAt: clock.current });
  });

  test("leaves the stored task alone when the request is invalid", async () => {
    const { service } = await setup();
    const { result: created } = await service.create({ title: "a", description: "" });

    await expect(service.update({ id: created.id, title: undefined })).rejects.toBeInstanceOf(EmptyTaskUpdateError);

    expect((await service.get({ id: created.id })).result).toEqual(created);
  });

  test("rejects an invalid request before looking the task up", async () => {
    const { service } = await setup();

    await expect(service.update({ id: unknownId, title: " " })).rejects.toBeInstanceOf(ValidationError);
  });

  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = await setup();

    await expect(service.update({ id: unknownId, title: "x" })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

describe("delete", () => {
  test("removes the task and returns it", async () => {
    const { service } = await setup();
    const { result: created } = await service.create({ title: "a", description: "" });

    const { result } = await service.delete({ id: created.id });

    expect(result).toEqual(created);
    await expect(service.get({ id: created.id })).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = await setup();

    await expect(service.delete({ id: unknownId })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

describe("context", () => {
  test("logs to the logger in the context instead of the service's own", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
    const { service } = await setup();

    await service.create({ title: "a", description: "" }, { logger: logger.child({ requestId: "req-1" }) });

    expect(JSON.parse(lines[0]!)).toMatchObject({ requestId: "req-1", msg: "Task created", taskId: idOf(1) });
  });
});

import { afterAll, describe, expect, test } from "bun:test";
import { createTestDatabase, resetDatabase } from "../../testing";
import { taskIdSchema, type Task } from "./task-models";
import { createDrizzleTaskRepo, type TaskRepo } from "./task-repo";

const at = new Date("2026-01-01T00:00:00.000Z");
const later = new Date("2026-01-02T00:00:00.000Z");
const idOf = (n: number) => taskIdSchema.parse(`tsk-${String(n).padStart(21, "0")}`);
const task = (overrides: Partial<Task> = {}): Task => ({
  id: idOf(1),
  title: "stored",
  description: "",
  createdAt: at,
  updatedAt: at,
  ...overrides,
});

const database = await createTestDatabase();
afterAll(() => database.dispose());

const createRepo = async (): Promise<TaskRepo> => {
  await resetDatabase(database.db);
  return createDrizzleTaskRepo({ db: database.db });
};

describe("createDrizzleTaskRepo", () => {
  test("get returns a saved task with its Dates intact", async () => {
    const repo = await createRepo();
    await repo.save({ task: task() });

    const read = await repo.get({ id: idOf(1) });

    expect(read).toEqual(task());
    expect(read?.createdAt).toBeInstanceOf(Date);
  });

  test("keeps a title and description at their maximum lengths", async () => {
    const repo = await createRepo();
    const long = task({ title: "t".repeat(200), description: "d".repeat(2000) });
    await repo.save({ task: long });

    expect(await repo.get({ id: long.id })).toEqual(long);
  });

  test("get returns undefined for an unknown id", async () => {
    const repo = await createRepo();

    expect(await repo.get({ id: idOf(999) })).toBeUndefined();
  });

  test("save with an existing id replaces the stored task", async () => {
    const repo = await createRepo();
    await repo.save({ task: task() });

    await repo.save({ task: task({ title: "changed", description: "new", updatedAt: later }) });

    expect(await repo.get({ id: idOf(1) })).toEqual(
      task({ title: "changed", description: "new", updatedAt: later }),
    );
    expect(await repo.list()).toHaveLength(1);
  });

  test("list returns tasks in the order they were first saved, even with equal timestamps", async () => {
    const repo = await createRepo();
    await repo.save({ task: task({ id: idOf(2), title: "first" }) });
    await repo.save({ task: task({ id: idOf(1), title: "second" }) });
    await repo.save({ task: task({ id: idOf(2), title: "first, updated", updatedAt: later }) });

    const titles = (await repo.list()).map((stored) => stored.title);

    expect(titles).toEqual(["first, updated", "second"]);
  });

  test("delete removes the task and returns it", async () => {
    const repo = await createRepo();
    await repo.save({ task: task() });

    expect(await repo.delete({ id: idOf(1) })).toEqual(task());
    expect(await repo.get({ id: idOf(1) })).toBeUndefined();
  });

  test("delete returns undefined for an unknown id", async () => {
    const repo = await createRepo();

    expect(await repo.delete({ id: idOf(999) })).toBeUndefined();
  });
});

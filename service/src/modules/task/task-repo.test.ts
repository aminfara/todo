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
  test("get returns an inserted task with its Dates intact", async () => {
    const repo = await createRepo();
    await repo.insert({ task: task() });

    const read = await repo.get({ id: idOf(1) });

    expect(read).toEqual(task());
    expect(read?.createdAt).toBeInstanceOf(Date);
  });

  test("keeps a title and description at their maximum lengths", async () => {
    const repo = await createRepo();
    const long = task({ title: "t".repeat(200), description: "d".repeat(2000) });
    await repo.insert({ task: long });

    expect(await repo.get({ id: long.id })).toEqual(long);
  });

  test("get returns undefined for an unknown id", async () => {
    const repo = await createRepo();

    expect(await repo.get({ id: idOf(999) })).toBeUndefined();
  });

  test("update writes only the given columns and returns the stored task", async () => {
    const repo = await createRepo();
    await repo.insert({ task: task({ title: "old", description: "keep" }) });

    const updated = await repo.update({ id: idOf(1), changes: { title: "new", updatedAt: later } });

    expect(updated).toEqual(task({ title: "new", description: "keep", updatedAt: later }));
    expect(await repo.get({ id: idOf(1) })).toEqual(updated);
  });

  test("update keeps columns that changed since the caller last read the task", async () => {
    const repo = await createRepo();
    await repo.insert({ task: task({ title: "old", description: "old" }) });
    await repo.update({ id: idOf(1), changes: { description: "written by someone else" } });

    await repo.update({ id: idOf(1), changes: { title: "new" } });

    expect(await repo.get({ id: idOf(1) })).toMatchObject({
      title: "new",
      description: "written by someone else",
    });
  });

  test("update returns undefined and stores nothing for an unknown id", async () => {
    const repo = await createRepo();

    expect(await repo.update({ id: idOf(999), changes: { title: "x" } })).toBeUndefined();
    expect(await repo.list()).toEqual([]);
  });

  test("list returns tasks in the order they were inserted, even with equal timestamps", async () => {
    const repo = await createRepo();
    await repo.insert({ task: task({ id: idOf(2), title: "first" }) });
    await repo.insert({ task: task({ id: idOf(1), title: "second" }) });
    await repo.update({ id: idOf(2), changes: { title: "first, updated", updatedAt: later } });

    const titles = (await repo.list()).map((stored) => stored.title);

    expect(titles).toEqual(["first, updated", "second"]);
  });

  test("delete removes the task and returns it", async () => {
    const repo = await createRepo();
    await repo.insert({ task: task() });

    expect(await repo.delete({ id: idOf(1) })).toEqual(task());
    expect(await repo.get({ id: idOf(1) })).toBeUndefined();
  });

  test("delete returns undefined for an unknown id", async () => {
    const repo = await createRepo();

    expect(await repo.delete({ id: idOf(999) })).toBeUndefined();
  });
});

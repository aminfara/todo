import { describe, expect, test } from "bun:test";
import { taskIdSchema, type Task } from "./task-models";
import { createInMemoryTaskRepo } from "./task-repo";

const at = new Date("2026-01-01T00:00:00.000Z");
const task = (): Task => ({
  id: taskIdSchema.parse(`tsk-${"1".repeat(21)}`),
  title: "stored",
  description: "",
  createdAt: at,
  updatedAt: at,
});

// Behaves like a database: callers get copies, never the stored object.
describe("createInMemoryTaskRepo", () => {
  test("a saved task does not change when the caller mutates its own object", async () => {
    const repo = createInMemoryTaskRepo();
    const mine = task();
    await repo.save({ task: mine });

    mine.title = "mutated";

    expect((await repo.get({ id: mine.id }))?.title).toBe("stored");
  });

  test("a task read back does not change the store when mutated", async () => {
    const repo = createInMemoryTaskRepo();
    await repo.save({ task: task() });

    const [read] = await repo.list();
    read!.title = "mutated";

    expect((await repo.get({ id: read!.id }))?.title).toBe("stored");
  });

  test("keeps Date values as Dates", async () => {
    const repo = createInMemoryTaskRepo();
    await repo.save({ task: task() });

    const [read] = await repo.list();

    expect(read!.createdAt).toEqual(at);
  });
});

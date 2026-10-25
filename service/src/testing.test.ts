import { afterAll, describe, expect, test } from "bun:test";
import { taskIdSchema } from "./modules/task";
import { tasks } from "./modules/task/task-schema";
import { createTestDatabase, resetDatabase } from "./testing";

const database = await createTestDatabase();
afterAll(() => database.dispose());

const row = (n: number) => ({
  id: taskIdSchema.parse(`tsk-${String(n).padStart(21, "0")}`),
  title: "t",
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("resetDatabase", () => {
  test("empties every table and restarts identity columns", async () => {
    await database.db.insert(tasks).values([row(1), row(2)]);

    await resetDatabase(database.db);

    expect(await database.db.$count(tasks)).toBe(0);
    const [inserted] = await database.db.insert(tasks).values(row(3)).returning();
    expect(inserted!.seq).toBe(1);
  });
});

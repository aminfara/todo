import { asc, eq } from "drizzle-orm";
import type { Db } from "../../database";
import type { Task, TaskId } from "./task-models";
import { tasks } from "./task-schema";

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(request: { id: TaskId }): Promise<Task | undefined>;
  save(request: { task: Task }): Promise<void>;
  /** Returns the removed task, or undefined when there was none. */
  delete(request: { id: TaskId }): Promise<Task | undefined>;
  dispose?(): Promise<void>;
}

// Rows are trusted, not parsed: the service validated every task before saving it and the columns
// enforce the types, so only the id's brand is restored. `seq` only orders rows and stays here.
const toTask = ({ seq: _seq, ...row }: typeof tasks.$inferSelect): Task => ({ ...row, id: row.id as TaskId });
const toTaskOrUndefined = (row: typeof tasks.$inferSelect | undefined) => row && toTask(row);

export function createDrizzleTaskRepo({ db }: { db: Db }): TaskRepo {
  return {
    list: async () => (await db.select().from(tasks).orderBy(asc(tasks.seq))).map(toTask),
    get: async ({ id }) => toTaskOrUndefined((await db.select().from(tasks).where(eq(tasks.id, id)))[0]),
    save: async ({ task }) => {
      const { id: _id, ...changes } = task;
      await db.insert(tasks).values(task).onConflictDoUpdate({ target: tasks.id, set: changes });
    },
    delete: async ({ id }) => toTaskOrUndefined((await db.delete(tasks).where(eq(tasks.id, id)).returning())[0]),
  };
}

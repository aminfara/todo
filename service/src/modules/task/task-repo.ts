import { asc, eq } from "drizzle-orm";
import type { Db } from "../../database";
import type { Task, TaskId } from "./task-models";
import { tasks } from "./task-schema";

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>;

export interface TaskRepo {
  list(): Promise<Task[]>;
  get(request: { id: TaskId }): Promise<Task | undefined>;
  insert(request: { task: Task }): Promise<void>;
  /** Writes only `changes`, so it cannot overwrite columns it does not name. Returns the stored task, or undefined when there is none. */
  update(request: { id: TaskId; changes: TaskPatch }): Promise<Task | undefined>;
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
    insert: async ({ task }) => {
      await db.insert(tasks).values(task);
    },
    update: async ({ id, changes }) =>
      toTaskOrUndefined((await db.update(tasks).set(changes).where(eq(tasks.id, id)).returning())[0]),
    delete: async ({ id }) => toTaskOrUndefined((await db.delete(tasks).where(eq(tasks.id, id)).returning())[0]),
  };
}

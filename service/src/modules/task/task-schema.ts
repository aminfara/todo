import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// The module's table. Only task-repo.ts reads or writes it.
export const tasks = pgTable("tasks", {
  // Insertion order, so tasks created in the same millisecond still list in creation order.
  seq: bigint({ mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  id: text().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
});

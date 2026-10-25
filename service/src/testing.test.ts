import { afterAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { createTestDatabase, resetDatabase } from "./testing";

const database = await createTestDatabase();
afterAll(() => database.dispose());

describe("resetDatabase", () => {
  test("empties every table and restarts identity columns", async () => {
    const { db } = database;
    await db.execute(
      sql`create table reset_probe (seq bigint generated always as identity, name text)`,
    );
    await db.execute(sql`insert into reset_probe (name) values ('a'), ('b')`);

    await resetDatabase(db);

    expect(await db.execute(sql`select count(*)::int as n from reset_probe`)).toMatchObject({
      rows: [{ n: 0 }],
    });
    await db.execute(sql`insert into reset_probe (name) values ('c')`);
    expect(await db.execute(sql`select seq::int as seq from reset_probe`)).toMatchObject({
      rows: [{ seq: 1 }],
    });
  });
});

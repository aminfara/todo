import { afterEach, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { assertMigrated, DatabaseNotMigratedError, drizzleConfig } from "./database";
import { InternalServerError } from "./errors";
import { createTestDatabase } from "./testing";

const disposers: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(disposers.splice(0).map((dispose) => dispose()));
});

// Production does not migrate on start; it refuses to serve a schema older than the code.
describe("assertMigrated", () => {
  test("passes when every migration has been applied", async () => {
    const database = await createTestDatabase();
    disposers.push(database.dispose);

    await assertMigrated({ db: database.db });
  });

  test("throws DatabaseNotMigratedError on a database that was never migrated", async () => {
    const client = new PGlite();
    disposers.push(() => client.close());

    const check = assertMigrated({ db: drizzle({ client, ...drizzleConfig }) });

    await expect(check).rejects.toBeInstanceOf(DatabaseNotMigratedError);
  });

  test("throws DatabaseNotMigratedError when the newest migration is missing", async () => {
    const database = await createTestDatabase();
    disposers.push(database.dispose);
    await database.db.execute(
      sql`delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)`,
    );

    const check = assertMigrated({ db: database.db });

    await expect(check).rejects.toBeInstanceOf(DatabaseNotMigratedError);
    await expect(check).rejects.toBeInstanceOf(InternalServerError);
  });
});

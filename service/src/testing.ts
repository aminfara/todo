import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Config } from "./config";
import { createContainer, type ContainerOverrides } from "./container";
import { drizzleConfig, migrationsFolder, type Database, type Db } from "./database";

// Logger is silent when env is "test".
export const testConfig: Config = {
  env: "test",
  logLevel: "info",
  host: "localhost",
  port: 3001,
  corsOrigin: "http://localhost:3000",
  databaseUrl: "postgres://unused-in-tests",
};

// Migrating takes most of a second; cloning the migrated database takes about a tenth of that.
let template: Promise<PGlite> | undefined;
const migratedTemplate = () =>
  (template ??= (async () => {
    const client = new PGlite();
    await migrate(drizzle({ client, ...drizzleConfig }), { migrationsFolder });
    return client;
  })());

/**
 * A fresh, migrated, in-memory Postgres (PGlite). Create one per test file and call
 * `resetDatabase` before each test: a clone costs about 100 ms, a reset a few.
 */
export async function createTestDatabase(): Promise<Database> {
  // clone() is typed as the PGlite interface, but it returns a PGlite instance.
  const client = (await (await migratedTemplate()).clone()) as PGlite;
  return { db: drizzle({ client, ...drizzleConfig }), dispose: () => client.close() };
}

/**
 * A container on its own PGlite database, which it disposes with everything else it created.
 * Pass `database` to share a file's database instead; the container then leaves it open.
 */
export const createTestContainer = (overrides: ContainerOverrides = {}) =>
  createContainer({ config: testConfig, connectDatabase: createTestDatabase, ...overrides });

/** Empties every application table and restarts identity columns. Migration history is kept. */
export async function resetDatabase(db: Db): Promise<void> {
  await db.execute(sql`
    do $$
    declare table_name text;
    begin
      for table_name in select format('%I.%I', schemaname, tablename) from pg_tables where schemaname = 'public' loop
        execute 'truncate table ' || table_name || ' restart identity cascade';
      end loop;
    end $$
  `);
}

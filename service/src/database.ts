import { SQL } from "bun";
import { fileURLToPath } from "node:url";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { bigint, pgSchema, text, type PgDatabase, type PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { DrizzleConfig } from "drizzle-orm/utils";
import { InternalServerError } from "./errors";

/** What repos depend on: any Postgres driver, so tests can run on PGlite and production on Bun SQL. */
export type Db = PgDatabase<PgQueryResultHKT>;

export interface Database {
  db: Db;
  dispose(): Promise<void>;
}

/** Shared by every driver, so the column names match the migrations drizzle-kit generates. */
export const drizzleConfig = { casing: "snake_case" } satisfies DrizzleConfig;

export const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export class DatabaseNotMigratedError extends InternalServerError {
  constructor(pending: number) {
    super(`The database is missing ${pending} migration(s); run \`bun run db:migrate\` before starting`);
  }
}

// Drizzle's own bookkeeping, read here without the DDL its migrator would run.
const informationSchemaTables = pgSchema("information_schema").table("tables", {
  tableSchema: text(),
  tableName: text(),
});
const appliedMigrations = pgSchema("drizzle").table("__drizzle_migrations", {
  createdAt: bigint({ mode: "number" }),
});

/**
 * Throws DatabaseNotMigratedError when a migration in `migrationsFolder` has not been applied.
 * Uses Drizzle's rule: a migration is pending when it is newer than the newest applied one.
 */
export async function assertMigrated({ db }: { db: Db }): Promise<void> {
  const tracked = await db.$count(
    informationSchemaTables,
    and(
      eq(informationSchemaTables.tableSchema, "drizzle"),
      eq(informationSchemaTables.tableName, "__drizzle_migrations"),
    ),
  );
  const [newest] = tracked
    ? await db.select().from(appliedMigrations).orderBy(desc(appliedMigrations.createdAt)).limit(1)
    : [];
  const appliedUpTo = newest?.createdAt ?? -Infinity;
  const pending = readMigrationFiles({ migrationsFolder }).filter((file) => file.folderMillis > appliedUpTo);
  if (pending.length > 0) throw new DatabaseNotMigratedError(pending.length);
}

export interface ConnectDatabaseParameters {
  url: string;
  /** "apply" runs pending migrations (dev, the migrate step); "require" only checks (production). */
  migrations: "apply" | "require";
}

/** Connects with Bun's SQL driver, then applies or checks migrations before returning. */
export async function connectDatabase({ url, migrations }: ConnectDatabaseParameters): Promise<Database> {
  const client = new SQL(url);
  const db = drizzle({ client, ...drizzleConfig });
  try {
    if (migrations === "apply") await migrate(db, { migrationsFolder });
    else await assertMigrated({ db });
  } catch (err) {
    await client.close();
    throw err;
  }
  return { db, dispose: () => client.close() };
}

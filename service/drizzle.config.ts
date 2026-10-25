import { defineConfig } from "drizzle-kit";

// `bun run db:generate` diffs the module schemas against ./drizzle and writes a new migration.
// The service applies pending migrations on start (see src/database.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/*-schema.ts",
  out: "./drizzle",
  casing: "snake_case",
});

import { loadConfig } from "./config";
import { connectDatabase } from "./database";
import { createLogger } from "./logger";

// `bun run db:migrate`: the release step that applies pending migrations, once, before the new
// version starts. In production the service itself only checks them.
const config = loadConfig();
const logger = createLogger({ config });
const database = await connectDatabase({ url: config.databaseUrl, migrations: "apply" });
await database.dispose();
logger.info("Migrations applied");

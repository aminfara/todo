import { getPrintableConfig, loadConfig } from "@/config.js";
import { setupLogger } from "@/logger.js";

const config = loadConfig();
const logger = setupLogger({ config });

logger.info({ config: getPrintableConfig(config) }, "Config Loaded");

logger.debug("Hello Luffy! 🏴‍☠️");

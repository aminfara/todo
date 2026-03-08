import { getPrintableConfig, loadConfig } from "@/config.js";

console.log(`LoadedConfig: ${JSON.stringify(getPrintableConfig(loadConfig()))}`);

console.log("Hello, world!");

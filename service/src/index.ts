import { createApp } from "./app";

export type { AppType } from "./app";

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: createApp().fetch,
};

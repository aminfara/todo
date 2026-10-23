import type { AppType } from "@tasktogether/service";
import type { Task as TaskModel } from "@tasktogether/service/contracts";
import { hc } from "hono/client";
import type { JSONParsed } from "hono/utils/types";
import { config } from "./config";

const client = hc<AppType>(config.apiUrl);

// The backend model as it arrives over JSON (Dates become ISO strings).
export type Task = JSONParsed<TaskModel>;

export class ApiError extends Error {}

// hc doesn't throw on non-2xx; turn those into errors the UI can show.
type Res = {
  ok: boolean;
  statusText: string;
  json(): Promise<unknown>;
};

const ok = async (res: Res) => {
  if (res.ok) return res;
  const body = (await res.json().catch(() => null)) as {
    error?: {
      message?: string;
      details?: { issues?: { path: string; message: string }[] };
    };
  } | null;
  const issues = body?.error?.details?.issues;
  const detail = issues
    ? issues.map((i) => `${i.path}: ${i.message}`).join(", ")
    : (body?.error?.message ?? res.statusText);
  throw new ApiError(detail);
};

// After ok() the status is 2xx, so the body is the success shape: { result }.
const unwrap = async <T>(res: Res) =>
  ((await (await ok(res)).json()) as { result: T }).result;

export const tasksApi = {
  list: async () => unwrap<Task[]>(await client.tasks.$get()),
  create: async (json: { title: string; description: string }) =>
    unwrap<Task>(await client.tasks.$post({ json })),
  update: async (id: string, json: { title?: string; description?: string }) =>
    unwrap<Task>(await client.tasks[":id"].$patch({ param: { id }, json })),
  remove: async (id: string) => {
    await ok(await client.tasks[":id"].$delete({ param: { id } }));
  },
};

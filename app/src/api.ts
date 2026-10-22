import { hc, type InferResponseType } from "hono/client";
import type { AppType } from "@tasktogether/service";

const client = hc<AppType>("http://localhost:3001");

export type Todo = InferResponseType<typeof client.todos.$get, 200>[number];

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
    issues?: { path: string; message: string }[];
    message?: string;
    error?: string;
  } | null;
  const detail =
    body?.issues?.map((i) => `${i.path}: ${i.message}`).join(", ") ??
    body?.message ??
    body?.error ??
    res.statusText;
  throw new ApiError(detail);
};

// After ok() the status is 2xx, so the body is the success shape.
const body = async (res: Res) => (await ok(res)).json() as Promise<Todo>;

export const todosApi = {
  list: async () =>
    (await ok(await client.todos.$get())).json() as Promise<Todo[]>,
  create: async (json: { title: string; description?: string }) =>
    body(await client.todos.$post({ json })),
  update: async (id: string, json: { title?: string; description?: string }) =>
    body(await client.todos[":id"].$patch({ param: { id }, json })),
  remove: async (id: string) => {
    await ok(await client.todos[":id"].$delete({ param: { id } }));
  },
};

import type { AppType } from "@tasktogether/service";
import type {
  CreateTaskRequest,
  DeleteTaskRequest,
  Task as TaskModel,
  UpdateTaskRequest,
} from "@tasktogether/service/contracts";
import { hc } from "hono/client";
import type { JSONParsed } from "hono/utils/types";

// The backend model as it arrives over JSON (Dates become ISO strings).
export type Task = JSONParsed<TaskModel>;

export interface Issue {
  path: string;
  message: string;
}

/** A 4xx answer: something the user can correct. Anything else is thrown as a plain Error. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: Issue[] = [],
  ) {
    super(message);
  }
}

type Res<Body = unknown> = { ok: boolean; status: number; statusText: string; json(): Promise<Body> };
type ErrorBody = { error?: { message?: string; details?: { issues?: Issue[] } } };

// hc doesn't throw on non-2xx; turn those into errors.
const ok = async <R extends Res>(res: R): Promise<R> => {
  if (res.ok) return res;
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  const message = body?.error?.message ?? res.statusText;
  if (res.status >= 400 && res.status < 500) {
    throw new ApiError(message, res.status, body?.error?.details?.issues);
  }
  throw new Error(`The server failed (${res.status}): ${message}`);
};

// After ok() the status is 2xx, so the body is the success shape hc inferred from the route.
const unwrap = async <T>(res: Res<{ result: T }>) => (await (await ok(res)).json()).result;

export interface CreateTasksApiParameters {
  baseUrl: string;
  fetch?: typeof fetch;
}

export function createTasksApi({ baseUrl, fetch }: CreateTasksApiParameters) {
  const client = hc<AppType>(baseUrl, { fetch });
  return {
    list: async () => unwrap(await client.tasks.$get()),
    create: async (json: CreateTaskRequest) => unwrap(await client.tasks.$post({ json })),
    update: async ({ id, ...json }: UpdateTaskRequest) =>
      unwrap(await client.tasks[":id"].$patch({ param: { id }, json })),
    delete: async (param: DeleteTaskRequest) => unwrap(await client.tasks[":id"].$delete({ param })),
  };
}

export type TasksApi = ReturnType<typeof createTasksApi>;

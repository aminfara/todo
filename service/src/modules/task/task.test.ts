import { beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../../app";
import { createTestContainer } from "../../testing";
import { createTaskService } from "./task-service";

type JsonResponse = Omit<Response, "json"> & { json(): Promise<any> };

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({ container: createTestContainer() });
});

const send = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(
    app.request(path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  ) as Promise<JsonResponse>;

const create = async (body: unknown = { title: "Buy milk", description: "2 litres" }) =>
  (await (await send("POST", "/tasks", body)).json()).result as {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };

describe("create", () => {
  test("returns 201 with the stored task in a result envelope", async () => {
    const res = await send("POST", "/tasks", { title: "Buy milk", description: "2 litres" });

    expect(res.status).toBe(201);
    const { result } = await res.json();
    expect(result).toMatchObject({ title: "Buy milk", description: "2 litres" });
    expect(typeof result.id).toBe("string");
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  test("defaults description to empty and trims the title", async () => {
    const task = await create({ title: "  Walk dog  " });

    expect(task.title).toBe("Walk dog");
    expect(task.description).toBe("");
  });

  test("ignores unknown fields instead of storing them", async () => {
    const task = await create({ title: "x", id: "forced", secret: "s" });

    expect(task.id).not.toBe("forced");
    expect(task).not.toHaveProperty("secret");
  });

  test.each([
    ["missing title", {}],
    ["blank title", { title: "   " }],
    ["title over 200 chars", { title: "a".repeat(201) }],
    ["description over 2000 chars", { title: "x", description: "a".repeat(2001) }],
    ["non-string title", { title: 5 }],
  ])("rejects %s with a validation error", async (_name, body) => {
    const res = await send("POST", "/tasks", body);

    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("validation_failed");
    expect(error.details.issues.length).toBeGreaterThan(0);
  });

  test("accepts a title of exactly 200 chars", async () => {
    const res = await send("POST", "/tasks", { title: "a".repeat(200) });

    expect(res.status).toBe(201);
  });
});

describe("read", () => {
  test("lists tasks in creation order", async () => {
    await create({ title: "first" });
    await create({ title: "second" });

    const { result } = await (await send("GET", "/tasks")).json();

    expect(result.map((t: { title: string }) => t.title)).toEqual(["first", "second"]);
  });

  test("gets one task by id", async () => {
    const created = await create();

    const res = await send("GET", `/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual(created);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("GET", "/tasks/nope");

    expect(res.status).toBe(404);
    const { error } = await res.json();
    expect(error).toMatchObject({ code: "not_found", message: "Task nope not found" });
  });
});

describe("update", () => {
  test("changes only the supplied fields", async () => {
    const created = await create({ title: "old", description: "keep" });

    const res = await send("PATCH", `/tasks/${created.id}`, { title: "new" });

    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result).toMatchObject({ id: created.id, title: "new", description: "keep" });
    expect(result.createdAt).toBe(created.createdAt);
  });

  test("persists the change", async () => {
    const created = await create();
    await send("PATCH", `/tasks/${created.id}`, { description: "changed" });

    const fetched = (await (await send("GET", `/tasks/${created.id}`)).json()).result;

    expect(fetched.description).toBe("changed");
  });

  test("allows clearing the description", async () => {
    const created = await create();

    const { result } = await (await send("PATCH", `/tasks/${created.id}`, { description: "" })).json();

    expect(result.description).toBe("");
  });

  test("rejects an empty patch with 400", async () => {
    const created = await create();

    const res = await send("PATCH", `/tasks/${created.id}`, {});

    expect(res.status).toBe(400);
  });

  test("rejects a blank title with 400", async () => {
    const created = await create();

    const res = await send("PATCH", `/tasks/${created.id}`, { title: " " });

    expect(res.status).toBe(400);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("PATCH", "/tasks/nope", { title: "x" });

    expect(res.status).toBe(404);
  });
});

describe("delete", () => {
  test("removes the task and returns 204", async () => {
    const created = await create();

    const res = await send("DELETE", `/tasks/${created.id}`);

    expect(res.status).toBe(204);
    expect((await send("GET", `/tasks/${created.id}`)).status).toBe(404);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("DELETE", "/tasks/nope");

    expect(res.status).toBe(404);
  });
});

describe("error handling", () => {
  test("malformed JSON gives a 400 bad_request, not a 500", async () => {
    const res = (await app.request("/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    })) as JsonResponse;

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_request");
  });

  test("an unknown route gives a not_found error body", async () => {
    const res = await send("GET", "/nowhere");

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  test("echoes a client request id in the header and the error body", async () => {
    const res = await send("GET", "/tasks/nope", undefined, { "x-request-id": "req-abc" });

    expect(res.headers.get("x-request-id")).toBe("req-abc");
    expect((await res.json()).error.requestId).toBe("req-abc");
  });

  test("unexpected failures give a generic 500 that does not leak the cause", async () => {
    const real = createTestContainer();
    const taskService = {
      ...createTaskService({ taskRepo: real.taskRepo }),
      get: async () => {
        throw new Error("boom: db password is hunter2");
      },
    };
    app = createApp({ container: createTestContainer({ taskService }) });

    const res = await send("GET", "/tasks/any");

    expect(res.status).toBe(500);
    const { error } = await res.json();
    expect(error.code).toBe("internal_error");
    expect(JSON.stringify(error)).not.toContain("hunter2");
  });
});

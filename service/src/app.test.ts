import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { testClient } from "hono/testing";
import { pino } from "pino";
import { createApp } from "./app";
import type { ContainerOverrides } from "./container";
import { taskIdSchema } from "./modules/task";
import { createTestContainer, createTestDatabase, resetDatabase, stubTaskRepo } from "./testing";

// HTTP boundary only: status codes, input and error mapping, output stripping, request ids and
// logging. Domain rules are tested in modules/task.

// Well-formed but never issued by the service.
const unknownId = `tsk-${"a".repeat(21)}`;

type ErrorBody = { error: { code: string; message: string; details?: any; requestId: string } };
// Error bodies come from onError, which the typed client does not know about.
const errorOf = async (res: { json(): Promise<unknown> }) => ((await res.json()) as ErrorBody).error;

// One PGlite database for the file, emptied before each test. Containers are cheap to wire, so
// each test still gets its own, sharing the database (which the containers then leave open).
const database = await createTestDatabase();
afterAll(() => database.dispose());

const containers: { dispose(): Promise<void> }[] = [];
const appFor = async (overrides: ContainerOverrides = {}) => {
  const container = await createTestContainer({ database, ...overrides });
  containers.push(container);
  return createApp({ container });
};
const clientFor = async (overrides: ContainerOverrides = {}) => testClient(await appFor(overrides));

let client: Awaited<ReturnType<typeof clientFor>>;

beforeEach(async () => {
  await resetDatabase(database.db);
  client = await clientFor();
});

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.dispose()));
});

const create = async (json = { title: "Buy milk", description: "2 litres" }) =>
  (await (await client.tasks.$post({ json })).json()).result;

describe("tasks routes", () => {
  test("POST returns 201 with the task in a result envelope and dates as ISO strings", async () => {
    const res = await client.tasks.$post({ json: { title: "Buy milk", description: "2 litres" } });

    expect(res.status).toBe(201);
    const { result } = await res.json();
    expect(result).toMatchObject({ title: "Buy milk", description: "2 litres" });
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  test("POST maps an invalid body to 400 with the issues", async () => {
    const res = await client.tasks.$post({ json: { title: "", description: "" } });

    expect<number>(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("bad_request");
    expect(error.details.issues).toEqual([{ path: "title", message: expect.any(String) }]);
  });

  test("GET lists stored tasks", async () => {
    const created = await create();

    const res = await client.tasks.$get();

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual([created]);
  });

  test("GET /:id returns the task", async () => {
    const created = await create();

    const res = await client.tasks[":id"].$get({ param: { id: created.id } });

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual(created);
  });

  test("GET /:id returns 404 with the message for a well-formed unknown id", async () => {
    const res = await client.tasks[":id"].$get({ param: { id: unknownId } });

    expect(res.status).toBe(404);
    expect(await errorOf(res)).toMatchObject({ code: "not_found", message: `Task ${unknownId} not found` });
  });

  test("GET /:id returns 400 for a malformed id", async () => {
    const res = await client.tasks[":id"].$get({ param: { id: "nope" } });

    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
  });

  test("PATCH /:id updates the task addressed by the path", async () => {
    const created = await create({ title: "old", description: "keep" });

    const res = await client.tasks[":id"].$patch({ param: { id: created.id }, json: { title: "new" } });

    expect(res.status).toBe(200);
    expect((await res.json()).result).toMatchObject({ id: created.id, title: "new", description: "keep" });
  });

  test("PATCH /:id ignores an id in the body", async () => {
    const created = await create();
    const json = { id: unknownId, title: "t" } as { title: string };

    const res = await client.tasks[":id"].$patch({ param: { id: created.id }, json });

    expect((await res.json()).result.id).toBe(created.id);
  });

  test("PATCH /:id maps an empty patch to 400", async () => {
    const created = await create();

    const res = await client.tasks[":id"].$patch({ param: { id: created.id }, json: {} });

    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
  });

  test("DELETE /:id removes the task and returns it", async () => {
    const created = await create();

    const res = await client.tasks[":id"].$delete({ param: { id: created.id } });

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual(created);
    expect((await client.tasks[":id"].$get({ param: { id: created.id } })).status).toBe(404);
  });

  test("DELETE /:id returns 404 for an unknown id", async () => {
    const res = await client.tasks[":id"].$delete({ param: { id: unknownId } });

    expect(res.status).toBe(404);
  });

  test("responses never include fields outside the response model", async () => {
    // A variable, not a literal, so TypeScript lets the extra field through as a buggy repo would.
    const row = {
      id: taskIdSchema.parse(unknownId),
      title: "t",
      description: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: "secret",
    };
    const leaky = stubTaskRepo({ list: async () => [row] });
    client = await clientFor({ taskRepo: leaky });

    const { result } = await (await client.tasks.$get()).json();

    expect(result[0]).not.toHaveProperty("passwordHash");
    expect(result[0]!.title).toBe("t");
  });
});

describe("error handling", () => {
  test("malformed JSON gives a 400 bad_request, not a 500", async () => {
    const app = await appFor();

    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
  });

  test("an unknown route gives a not_found error body", async () => {
    const res = await (await appFor()).request("/nowhere");

    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("not_found");
  });

  test("echoes a client request id in the header and the error body", async () => {
    const res = await client.tasks[":id"].$get(
      { param: { id: unknownId } },
      { headers: { "x-request-id": "req-abc" } },
    );

    expect(res.headers.get("x-request-id")).toBe("req-abc");
    expect((await errorOf(res)).requestId).toBe("req-abc");
  });

  test("unexpected failures give a generic 500 that does not leak the cause", async () => {
    const taskRepo = stubTaskRepo({
      get: async () => {
        throw new Error("boom: db password is hunter2");
      },
    });
    client = await clientFor({ taskRepo });

    const res = await client.tasks[":id"].$get({ param: { id: unknownId } });

    expect(res.status).toBe(500);
    const error = await errorOf(res);
    expect(error.code).toBe("internal_server_error");
    expect(JSON.stringify(error)).not.toContain("hunter2");
  });
});

describe("logging", () => {
  const logTo = (lines: string[]) => pino({ level: "debug" }, { write: (line: string) => void lines.push(line) });
  const entry = (lines: string[], msg: string) => lines.map((l) => JSON.parse(l)).find((l) => l.msg === msg);

  test("logs client errors at warn", async () => {
    const lines: string[] = [];
    client = await clientFor({ logger: logTo(lines) });

    await client.tasks[":id"].$get({ param: { id: unknownId } });

    expect(entry(lines, `Task ${unknownId} not found`)?.level).toBe(40);
  });

  test("logs unexpected failures at error", async () => {
    const lines: string[] = [];
    const taskRepo = stubTaskRepo({
      list: async () => {
        throw new Error("boom");
      },
    });
    client = await clientFor({ logger: logTo(lines), taskRepo });

    await client.tasks.$get();

    expect(entry(lines, "Unhandled error")?.level).toBe(50);
  });

  test("service logs carry the request id", async () => {
    const lines: string[] = [];
    client = await clientFor({ logger: logTo(lines) });

    await client.tasks.$post(
      { json: { title: "a", description: "" } },
      { headers: { "x-request-id": "req-abc" } },
    );

    expect(entry(lines, "Task created")).toMatchObject({ requestId: "req-abc" });
  });
});

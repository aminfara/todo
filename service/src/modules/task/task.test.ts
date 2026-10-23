import { beforeEach, describe, expect, test } from "bun:test";
import { pino } from "pino";
import { createApp } from "../../app";
import { createTestContainer } from "../../testing";
import { createInMemoryTaskRepo } from "./task-repo";

// Well-formed but never issued by the service.
const unknownId = `tsk-${"a".repeat(21)}`;

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

  test("trims the title", async () => {
    const task = await create({ title: "  Walk dog  ", description: "" });

    expect(task.title).toBe("Walk dog");
  });

  test("issues a prefixed id", async () => {
    const task = await create();

    expect(task.id).toMatch(/^tsk-[A-Za-z0-9]{21}$/);
  });

  test("ignores unknown fields instead of storing them", async () => {
    const task = await create({ title: "x", description: "", id: "forced", secret: "s" });

    expect(task.id).not.toBe("forced");
    expect(task).not.toHaveProperty("secret");
  });

  test.each([
    ["missing title", { description: "" }],
    ["missing description", { title: "x" }],
    ["blank title", { title: "   " }],
    ["title over 200 chars", { title: "a".repeat(201) }],
    ["description over 2000 chars", { title: "x", description: "a".repeat(2001) }],
    ["non-string title", { title: 5, description: "" }],
  ])("rejects %s with a validation error", async (_name, body) => {
    const res = await send("POST", "/tasks", body);

    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("bad_request");
    expect(error.details.issues.length).toBeGreaterThan(0);
  });

  test("accepts a title of exactly 200 chars", async () => {
    const res = await send("POST", "/tasks", { title: "a".repeat(200), description: "" });

    expect(res.status).toBe(201);
  });
});

describe("read", () => {
  test("lists stored tasks in a result envelope", async () => {
    const created = await create();

    const res = await send("GET", "/tasks");

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual([created]);
  });

  test("gets one task by id", async () => {
    const created = await create();

    const res = await send("GET", `/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual(created);
  });

  test("returns 404 for a well-formed id that does not exist", async () => {
    const res = await send("GET", `/tasks/${unknownId}`);

    expect(res.status).toBe(404);
    const { error } = await res.json();
    expect(error).toMatchObject({ code: "not_found", message: `Task ${unknownId} not found` });
  });

  test("returns 400 for a malformed id", async () => {
    const res = await send("GET", "/tasks/nope");

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_request");
  });
});

describe("update", () => {
  test("updates the task addressed by the path id", async () => {
    const created = await create({ title: "old", description: "keep" });

    const res = await send("PATCH", `/tasks/${created.id}`, { title: "new" });

    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result).toMatchObject({ id: created.id, title: "new", description: "keep" });
  });

  test("rejects an empty patch with 400", async () => {
    const created = await create();

    const res = await send("PATCH", `/tasks/${created.id}`, {});

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_request");
  });

  test("ignores an id in the body", async () => {
    const created = await create();

    const res = await send("PATCH", `/tasks/${created.id}`, { id: unknownId, title: "t" });

    expect((await res.json()).result.id).toBe(created.id);
  });

  test("rejects a blank title with 400", async () => {
    const created = await create();

    const res = await send("PATCH", `/tasks/${created.id}`, { title: " " });

    expect(res.status).toBe(400);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("PATCH", `/tasks/${unknownId}`, { title: "x" });

    expect(res.status).toBe(404);
  });
});

describe("delete", () => {
  test("removes the task and returns it", async () => {
    const created = await create();

    const res = await send("DELETE", `/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual(created);
    expect((await send("GET", `/tasks/${created.id}`)).status).toBe(404);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("DELETE", `/tasks/${unknownId}`);

    expect(res.status).toBe(404);
  });
});

describe("output sanitation", () => {
  test("never returns fields outside the response model", async () => {
    const leaky = {
      ...createInMemoryTaskRepo(),
      list: async () => [
        {
          id: unknownId,
          title: "t",
          description: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          passwordHash: "secret",
        },
      ],
    };
    app = createApp({ container: createTestContainer({ taskRepo: leaky }) });

    const body = await (await send("GET", "/tasks")).json();

    expect(body.result[0]).not.toHaveProperty("passwordHash");
    expect(body.result[0].title).toBe("t");
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
    const res = await send("GET", `/tasks/${unknownId}`, undefined, { "x-request-id": "req-abc" });

    expect(res.headers.get("x-request-id")).toBe("req-abc");
    expect((await res.json()).error.requestId).toBe("req-abc");
  });

  test("unexpected failures give a generic 500 that does not leak the cause", async () => {
    const taskRepo = {
      ...createInMemoryTaskRepo(),
      get: async () => {
        throw new Error("boom: db password is hunter2");
      },
    };
    app = createApp({ container: createTestContainer({ taskRepo }) });

    const res = await send("GET", `/tasks/${unknownId}`);

    expect(res.status).toBe(500);
    const { error } = await res.json();
    expect(error.code).toBe("internal_server_error");
    expect(JSON.stringify(error)).not.toContain("hunter2");
  });

  describe("logging", () => {
    const logTo = (lines: string[]) =>
      pino({ level: "debug" }, { write: (line: string) => void lines.push(line) });
    const levelOf = (lines: string[], msg: string) =>
      lines.map((l) => JSON.parse(l)).find((l) => l.msg === msg)?.level;

    test("logs client errors at warn", async () => {
      const lines: string[] = [];
      app = createApp({ container: createTestContainer({ logger: logTo(lines) }) });

      await send("GET", `/tasks/${unknownId}`);

      expect(levelOf(lines, `Task ${unknownId} not found`)).toBe(40);
    });

    test("logs unexpected failures at error", async () => {
      const lines: string[] = [];
      const taskRepo = {
        ...createInMemoryTaskRepo(),
        list: async () => {
          throw new Error("boom");
        },
      };
      app = createApp({ container: createTestContainer({ logger: logTo(lines), taskRepo }) });

      await send("GET", "/tasks");

      expect(levelOf(lines, "Unhandled error")).toBe(50);
    });
  });
});

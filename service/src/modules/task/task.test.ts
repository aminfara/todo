import { beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../../app";
import { createInMemoryTaskRepo } from "./task.repo";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({ taskRepo: createInMemoryTaskRepo() });
});

type JsonResponse = Omit<Response, "json"> & { json(): Promise<any> };

const send = (method: string, path: string, body?: unknown) =>
  Promise.resolve(
    app.request(path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  ) as Promise<JsonResponse>;

const create = async (body: unknown = { title: "Buy milk", description: "2 litres" }) =>
  (await send("POST", "/tasks", body)).json() as Promise<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  }>;

describe("create", () => {
  test("returns 201 with the stored task", async () => {
    const res = await send("POST", "/tasks", { title: "Buy milk", description: "2 litres" });

    expect(res.status).toBe(201);
    const task = await res.json();
    expect(task).toMatchObject({ title: "Buy milk", description: "2 litres" });
    expect(typeof task.id).toBe("string");
    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
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
  ])("rejects %s with 400", async (_name, body) => {
    const res = await send("POST", "/tasks", body);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_failed");
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

    const list = await (await send("GET", "/tasks")).json();

    expect(list.map((t: { title: string }) => t.title)).toEqual(["first", "second"]);
  });

  test("gets one task by id", async () => {
    const created = await create();

    const res = await send("GET", `/tasks/${created.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await send("GET", "/tasks/nope");

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });
});

describe("update", () => {
  test("changes only the supplied fields", async () => {
    const created = await create({ title: "old", description: "keep" });

    const res = await send("PATCH", `/tasks/${created.id}`, { title: "new" });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated).toMatchObject({ id: created.id, title: "new", description: "keep" });
    expect(updated.createdAt).toBe(created.createdAt);
  });

  test("persists the change", async () => {
    const created = await create();
    await send("PATCH", `/tasks/${created.id}`, { description: "changed" });

    const fetched = await (await send("GET", `/tasks/${created.id}`)).json();

    expect(fetched.description).toBe("changed");
  });

  test("allows clearing the description", async () => {
    const created = await create();

    const updated = await (await send("PATCH", `/tasks/${created.id}`, { description: "" })).json();

    expect(updated.description).toBe("");
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

describe("errors", () => {
  test("malformed JSON gives 400, not 500", async () => {
    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    expect(res.status).toBe(400);
  });
});

import { describe, expect, test } from "bun:test";
import { BadRequestError } from "../../errors";
import { TaskNotFoundError } from "./task-errors";
import { createInMemoryTaskRepo } from "./task-repo";
import { createTaskService } from "./task-service";

const idOf = (n: number) => `tsk-${String(n).padStart(21, "0")}`;
const unknownId = idOf(999);

const setup = () => {
  const clock = { current: new Date("2026-01-01T00:00:00.000Z") };
  let issued = 0;
  const service = createTaskService({
    taskRepo: createInMemoryTaskRepo(),
    newId: () => idOf(++issued),
    now: () => clock.current,
  });
  return { service, clock };
};

describe("create", () => {
  test("stamps the id and both timestamps from the injected id generator and clock", async () => {
    const { service, clock } = setup();

    const { result } = await service.create({ title: "Buy milk", description: "2 litres" });

    expect(result).toEqual({
      id: idOf(1),
      title: "Buy milk",
      description: "2 litres",
      createdAt: clock.current,
      updatedAt: clock.current,
    });
  });
});

describe("get", () => {
  test("returns a stored task", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "a", description: "" });

    const { result } = await service.get({ id: created.id });

    expect(result).toEqual(created);
  });

  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = setup();

    expect(service.get({ id: unknownId })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

describe("list", () => {
  test("returns an empty list when nothing is stored", async () => {
    const { service } = setup();

    expect(await service.list()).toEqual({ result: [] });
  });

  test("returns tasks in creation order", async () => {
    const { service } = setup();
    await service.create({ title: "first", description: "" });
    await service.create({ title: "second", description: "" });

    const { result } = await service.list();

    expect(result.map((task) => task.title)).toEqual(["first", "second"]);
  });
});

describe("update", () => {
  test("changes only the supplied fields", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "old", description: "keep" });

    const { result } = await service.update({ id: created.id, title: "new" });

    expect(result).toMatchObject({ id: created.id, title: "new", description: "keep" });
  });

  test("keeps createdAt and moves updatedAt to the current time", async () => {
    const { service, clock } = setup();
    const { result: created } = await service.create({ title: "a", description: "" });
    const later = new Date("2026-01-02T00:00:00.000Z");
    clock.current = later;

    const { result } = await service.update({ id: created.id, title: "b" });

    expect(result.createdAt).toEqual(created.createdAt);
    expect(result.updatedAt).toEqual(later);
  });

  test("persists the change", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "a", description: "before" });
    await service.update({ id: created.id, description: "after" });

    const { result } = await service.get({ id: created.id });

    expect(result.description).toBe("after");
  });

  test("allows clearing the description", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "a", description: "text" });

    const { result } = await service.update({ id: created.id, description: "" });

    expect(result.description).toBe("");
  });

  test("rejects an update with neither title nor description", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "a", description: "" });

    expect(service.update({ id: created.id })).rejects.toBeInstanceOf(BadRequestError);
  });

  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = setup();

    expect(service.update({ id: unknownId, title: "x" })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

describe("delete", () => {
  test("removes the task and returns it", async () => {
    const { service } = setup();
    const { result: created } = await service.create({ title: "a", description: "" });

    const { result } = await service.delete({ id: created.id });

    expect(result).toEqual(created);
    expect(service.get({ id: created.id })).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  test("throws TaskNotFoundError for an unknown id", async () => {
    const { service } = setup();

    expect(service.delete({ id: unknownId })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

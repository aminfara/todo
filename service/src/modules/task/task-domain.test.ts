import { describe, expect, test } from "bun:test";
import { ValidationError } from "../../validation";
import { newTask, parseTaskUpdate, taskUpdatePatch } from "./task-domain";
import { EmptyTaskUpdateError } from "./task-errors";
import { taskIdSchema } from "./task-models";

const id = taskIdSchema.parse(`tsk-${"1".repeat(21)}`);
const at = new Date("2026-01-01T00:00:00.000Z");

describe("newTask", () => {
  test("stamps the given id and time on both timestamps", () => {
    expect(newTask({ request: { title: "Buy milk", description: "2 litres" }, id, at })).toEqual({
      id,
      title: "Buy milk",
      description: "2 litres",
      createdAt: at,
      updatedAt: at,
    });
  });

  test("trims the title", () => {
    expect(newTask({ request: { title: "  Walk dog  ", description: "" }, id, at }).title).toBe("Walk dog");
  });

  test("drops fields the request does not define", () => {
    const request = { title: "x", description: "", id: "forced", secret: "s" };

    const task = newTask({ request, id, at });

    expect(task.id).toBe(id);
    expect(task).not.toHaveProperty("secret");
  });

  test("accepts a title of 200 chars and a description of 2000 chars", () => {
    const request = { title: "a".repeat(200), description: "d".repeat(2000) };

    expect(newTask({ request, id, at })).toMatchObject(request);
  });

  test.each([
    ["missing title", { description: "" }],
    ["missing description", { title: "x" }],
    ["empty title", { title: "", description: "" }],
    ["blank title", { title: "   ", description: "" }],
    ["title over 200 chars", { title: "a".repeat(201), description: "" }],
    ["description over 2000 chars", { title: "x", description: "a".repeat(2001) }],
    ["non-string title", { title: 5, description: "" }],
  ])("rejects %s with a ValidationError", (_name, request) => {
    expect(() => newTask({ request: request as never, id, at })).toThrow(ValidationError);
  });
});

describe("parseTaskUpdate", () => {
  test("returns the id and the supplied changes", () => {
    expect(parseTaskUpdate({ id, title: " new " })).toEqual({ id, changes: { title: "new" } });
  });

  test("drops changes that are explicitly undefined", () => {
    expect(parseTaskUpdate({ id, title: "new", description: undefined })).toEqual({
      id,
      changes: { title: "new" },
    });
  });

  test.each([
    ["no changes", { id }],
    ["only undefined changes", { id, title: undefined, description: undefined }],
  ])("rejects %s with EmptyTaskUpdateError", (_name, request) => {
    expect(() => parseTaskUpdate(request)).toThrow(EmptyTaskUpdateError);
  });

  test.each([
    ["a blank title", { id, title: " " }],
    ["a malformed id", { id: "nope", title: "x" }],
    ["a description over 2000 chars", { id, description: "a".repeat(2001) }],
  ])("rejects %s with a ValidationError", (_name, request) => {
    expect(() => parseTaskUpdate(request)).toThrow(ValidationError);
  });
});

describe("taskUpdatePatch", () => {
  const later = new Date("2026-01-02T00:00:00.000Z");

  test("holds only the supplied fields and the new updatedAt", () => {
    expect(taskUpdatePatch({ changes: { title: "new" }, at: later })).toEqual({ title: "new", updatedAt: later });
  });

  test("allows clearing the description", () => {
    expect(taskUpdatePatch({ changes: { description: "" }, at: later })).toEqual({
      description: "",
      updatedAt: later,
    });
  });
});

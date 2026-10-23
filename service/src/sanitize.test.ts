import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { sanitize } from "./sanitize";

const userSchema = z.object({ name: z.string(), joined: z.date() });

describe("sanitize", () => {
  test("drops fields the schema does not name", () => {
    const user = { name: "ali", joined: new Date(0), password: "hunter2" };

    expect(sanitize(userSchema, user)).toEqual({ name: "ali", joined: new Date(0) });
  });

  test("keeps Date values as they are", () => {
    const joined = new Date(0);

    expect(sanitize(userSchema, { name: "ali", joined }).joined).toBe(joined);
  });

  test("drops extra fields inside nested objects and arrays", () => {
    const schema = z.object({ result: z.array(userSchema) });
    const value = { result: [{ name: "a", joined: new Date(0), password: "p" }], extra: 1 };

    expect(sanitize(schema, value)).toEqual({ result: [{ name: "a", joined: new Date(0) }] });
  });

  test("handles optional and nullable fields", () => {
    const schema = z.object({ nick: z.string().optional(), bio: z.object({ text: z.string() }).nullable() });

    expect(sanitize(schema, { bio: null, x: 1 } as never)).toEqual({ bio: null });
    expect(sanitize(schema, { bio: { text: "t", x: 1 } } as never)).toEqual({ bio: { text: "t" } });
  });

  test("does not mutate its input", () => {
    const user = { name: "ali", joined: new Date(0), password: "hunter2" };

    sanitize(userSchema, user);

    expect(user.password).toBe("hunter2");
  });

  test("does not validate: wrong types pass through untouched", () => {
    expect(sanitize(userSchema, { name: 5 as never, joined: new Date(0) }).name).toBe(5 as never);
  });
});

import { describe, expect, test } from "bun:test";
import { getUniqueId, InvalidIdError } from "./id";

describe("getUniqueId", () => {
  test("prefixes a 21 char alphanumeric nanoid", () => {
    expect(getUniqueId("tsk")).toMatch(/^tsk-[A-Za-z0-9]{21}$/);
  });

  test("generates a different id each time", () => {
    expect(getUniqueId("tsk")).not.toBe(getUniqueId("tsk"));
  });

  test.each(["ab", "abcd", "AB1", ""])("rejects the prefix %p", (prefix) => {
    expect(() => getUniqueId(prefix)).toThrow(InvalidIdError);
  });
});

import { describe, expect, test } from "bun:test";
import { toErrorCode } from "./errors";

describe("toErrorCode", () => {
  test.each([
    [400, "bad_request"],
    [404, "not_found"],
    [422, "unprocessable_entity"],
    [500, "internal_server_error"],
  ])("maps %i to %s", (statusCode, code) => {
    expect(toErrorCode(statusCode)).toBe(code);
  });

  test("falls back to http_error for a status the library does not name", () => {
    expect(toErrorCode(299)).toBe("http_error");
  });
});


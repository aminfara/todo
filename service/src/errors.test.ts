import { describe, expect, test } from "bun:test";
import { AppError, BadRequestError, InternalServerError, NotFoundError, toErrorCode } from "./errors";

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

describe("error classes", () => {
  test.each<[AppError, number]>([
    [new BadRequestError("x"), 400],
    [new NotFoundError("x"), 404],
    [new InternalServerError("x"), 500],
  ])("%p carries its HTTP status", (error, statusCode) => {
    expect<number>(error.statusCode).toBe(statusCode);
  });
});

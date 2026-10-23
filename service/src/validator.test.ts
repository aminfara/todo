import { describe, expect, test } from "bun:test";
import { BadRequestError } from "./errors";
import { ValidationError } from "./validator";

describe("ValidationError", () => {
  test("is a bad request carrying the issues", () => {
    const error = new ValidationError([{ path: "title", message: "required" }]);

    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ issues: [{ path: "title", message: "required" }] });
  });
});

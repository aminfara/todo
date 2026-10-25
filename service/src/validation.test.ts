import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { BadRequestError } from "./errors";
import { validate, ValidationError } from "./validation";

const schema = z.object({ name: z.string().trim(), tags: z.array(z.object({ label: z.string().min(1) })) });

describe("validate", () => {
  test("returns the parsed output, stripped of unknown fields", () => {
    expect(validate(schema, { name: " ali ", tags: [], extra: 1 })).toEqual({ name: "ali", tags: [] });
  });

  test("throws a bad request ValidationError listing each issue by dotted path", () => {
    let error: unknown;
    try {
      validate(schema, { name: 5, tags: [{ label: "" }] });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as ValidationError).details).toEqual({
      issues: [
        { path: "name", message: expect.any(String) },
        { path: "tags.0.label", message: expect.any(String) },
      ],
    });
  });
});

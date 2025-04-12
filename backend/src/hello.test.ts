import { greet } from "@/hello.js";

describe("greet function", () => {
  it("should return a greeting with the provided name", () => {
    const result = greet("World");
    expect(result).toBe("Hello, World!");
  });

  it("should return a greeting with 'Guest' when no name is provided", () => {
    const result = greet();
    expect(result).toBe("Hello, Guest!");
  });

  it("should properly handle various input names", () => {
    expect(greet("Alice")).toBe("Hello, Alice!");
    expect(greet("Bob")).toBe("Hello, Bob!");
  });
});

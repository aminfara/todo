import z from "zod/v4";

export const zBoolean = z.enum(["true", "false"]).transform((value) => value === "true");
export const zShortString = z.string().min(1).max(100);

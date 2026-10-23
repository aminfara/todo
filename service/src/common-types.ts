import { z } from "zod";

// Prefixed nanoid, e.g. "tsk-V1StGXR8_Z5jdHi6B-myT". The prefix names the entity type.
export const idSchema = z
  .string()
  .length(25)
  .regex(/^[a-z]{3}-[A-Za-z0-9]{21}$/);

export type Id = z.infer<typeof idSchema>;

export const titleSchema = z.string().trim().min(1).max(200);

export const descriptionSchema = z.string().max(2000);

/** Mixin: `entitySchema.extend(timestampsSchema.shape)`. */
export const timestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

import { customAlphabet } from "nanoid";
import { idSchema, type Id } from "./common-types";
import { InternalServerError } from "./errors";

export class InvalidIdError extends InternalServerError {
  constructor(options?: ErrorOptions) {
    super("Failed to generate a valid id", options);
  }
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(ALPHABET, 21);

/** `prefix` is the 3 lowercase letters naming the entity type, e.g. "tsk". */
export function getUniqueId(prefix: string): Id {
  const result = idSchema.safeParse(`${prefix}-${nanoid()}`);
  if (!result.success) throw new InvalidIdError({ cause: result.error });
  return result.data;
}

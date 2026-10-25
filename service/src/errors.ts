import status from "http-status";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorResponse } from "./error-contracts";

// Only generic HTTP errors live here. Errors specific to one module or function are defined next
// to the code that throws them (ValidationError, InvalidIdError, TaskNotFoundError, ...).

/** What an error response may carry besides its message. */
export type ErrorDetails = ErrorResponse["error"]["details"];

export interface AppErrorOptions extends ErrorOptions {
  statusCode: ContentfulStatusCode;
  // Safe to send to clients; never put internals here.
  details?: ErrorDetails;
}

type SubclassOptions = Omit<AppErrorOptions, "statusCode">;

export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;
  readonly details: ErrorDetails;

  constructor(message: string, { statusCode, details, ...options }: AppErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: status.BAD_REQUEST });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: status.NOT_FOUND });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: status.INTERNAL_SERVER_ERROR });
  }
}

/** Machine-readable error code for a status, from the library's name table: 404 -> "not_found". */
export function toErrorCode(statusCode: number): string {
  const name = (status as unknown as Record<string, unknown>)[`${statusCode}_NAME`];
  return typeof name === "string" ? name.toLowerCase() : "http_error";
}

import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface AppErrorOptions extends ErrorOptions {
  statusCode: ContentfulStatusCode;
  code: string;
  // Safe to send to clients; never put internals here.
  details?: unknown;
}

type SubclassOptions = Omit<AppErrorOptions, "statusCode" | "code">;

export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;
  readonly code: string;
  readonly details: unknown;

  constructor(message: string, { statusCode, code, details, ...options }: AppErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: 400, code: "bad_request" });
  }
}

export class ValidationError extends AppError {
  constructor(issues: { path: string; message: string }[], options?: ErrorOptions) {
    super("Request validation failed", {
      ...options,
      statusCode: 400,
      code: "validation_failed",
      details: { issues },
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: 404, code: "not_found" });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, options?: SubclassOptions) {
    super(message, { ...options, statusCode: 500, code: "internal_error" });
  }
}

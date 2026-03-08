import status from "http-status";

export interface TodosErrorOptions extends ErrorOptions {
  statusCode?: number;
}

export class TodosError extends Error {
  public statusCode: number;

  constructor(message: string, options?: TodosErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.statusCode = options?.statusCode ?? status.INTERNAL_SERVER_ERROR;
  }
}

export class NotFoundError extends TodosError {
  constructor(message: string, options?: Omit<TodosErrorOptions, "statusCode">) {
    super(message, { ...options, statusCode: status.NOT_FOUND });
  }
}

export class BadRequestError extends TodosError {
  constructor(message: string, options?: Omit<TodosErrorOptions, "statusCode">) {
    super(message, { ...options, statusCode: status.BAD_REQUEST });
  }
}

import { BadRequestError, NotFoundError } from "../../errors";

export class TaskNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Task ${id} not found`);
  }
}

export class EmptyTaskUpdateError extends BadRequestError {
  constructor() {
    super("An update needs at least one of title or description");
  }
}

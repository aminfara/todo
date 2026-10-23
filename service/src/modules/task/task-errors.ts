import { NotFoundError } from "../../errors";

export class TaskNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Task ${id} not found`);
  }
}

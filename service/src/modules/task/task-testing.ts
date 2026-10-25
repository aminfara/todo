import type { TaskRepo } from "./task-repo";

const notStubbed = async () => {
  throw new Error("This TaskRepo method is not stubbed in this test");
};

/** A TaskRepo whose unstubbed methods throw, so a test shows exactly which calls it fakes. */
export const stubTaskRepo = (methods: Partial<TaskRepo>): TaskRepo => ({
  list: notStubbed,
  get: notStubbed,
  insert: notStubbed,
  update: notStubbed,
  delete: notStubbed,
  ...methods,
});

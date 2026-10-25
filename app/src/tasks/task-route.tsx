import { createTaskRequestSchema, updateTaskRequestSchema } from "@tasktogether/service/contracts";
import { useState } from "react";
import { data, useFetcher, useLoaderData, type ActionFunctionArgs, type RouteObject } from "react-router";
import type { ZodType } from "zod";
import { RouteErrorBoundary } from "../route-error-boundary";
import { TaskForm, type TaskActionResult } from "./task-form";
import { ApiError, type Task, type TaskApi } from "./task-api";

export interface CreateTaskRouteParameters {
  api: TaskApi;
}

type LoaderData = { tasks: Task[] };

// Checked in the browser for instant feedback, reported like the service's own 400; the service
// validates again and has the last word.
const check = <T,>(schema: ZodType<T>, value: unknown) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw new ApiError("Invalid input", 400, issues);
  }
  return parsed.data;
};

const fieldsOf = (form: FormData) => ({
  title: String(form.get("title") ?? ""),
  description: String(form.get("description") ?? ""),
});

/**
 * The task list page. The loader reads the list, the action handles each form's `intent`, and React
 * Router reloads the list after every successful action. Errors the user can fix come back as action
 * data and render next to the form; anything else reaches the error boundary.
 */
export function createTaskRoute({ api }: CreateTaskRouteParameters): RouteObject {
  const run = async (form: FormData) => {
    const id = String(form.get("id") ?? "");
    switch (form.get("intent")) {
      case "create":
        return api.create(check(createTaskRequestSchema, fieldsOf(form)));
      case "update":
        return api.update(check(updateTaskRequestSchema, { id, ...fieldsOf(form) }));
      case "delete":
        return api.delete({ id });
      default:
        throw new Error(`Unknown form intent: ${form.get("intent")}`);
    }
  };

  return {
    index: true,
    loader: async (): Promise<LoaderData> => ({ tasks: await api.list() }),
    action: async ({ request }: ActionFunctionArgs) => {
      try {
        await run(await request.formData());
        return { ok: true } satisfies TaskActionResult;
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        const issues = error.issues.length
          ? error.issues.map((i) => `${i.path}: ${i.message}`)
          : [error.message];
        // A non-2xx status also stops React Router from reloading the list for nothing.
        return data<TaskActionResult>({ ok: false, issues }, { status: error.status });
      }
    },
    // A 404 means another tab or user changed the list: reload it so the stale row disappears.
    shouldRevalidate: ({ actionStatus, defaultShouldRevalidate }) =>
      actionStatus === 404 || defaultShouldRevalidate,
    Component: TasksPage,
    ErrorBoundary: RouteErrorBoundary,
  };
}

function TasksPage() {
  const { tasks } = useLoaderData<() => Promise<LoaderData>>();
  return (
    <main className="app">
      <h1>Tasks</h1>
      <TaskForm intent="create" submitLabel="Add" />
      <ul className="task-list">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
      {tasks.length === 0 && <p>No tasks yet.</p>}
    </main>
  );
}

function TaskItem({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false);
  const remover = useFetcher<TaskActionResult>();
  const removeIssues = remover.data?.ok === false ? remover.data.issues : [];

  if (editing) {
    return (
      <li>
        <TaskForm
          intent="update"
          task={task}
          submitLabel="Save"
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li>
      <strong>{task.title}</strong>
      {task.description && <p>{task.description}</p>}
      <button onClick={() => setEditing(true)}>Edit</button>
      <remover.Form method="post" style={{ display: "inline" }}>
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={task.id} />
        <button type="submit" disabled={remover.state !== "idle"}>
          Delete
        </button>
      </remover.Form>
      {removeIssues.map((issue) => (
        <p key={issue} role="alert" className="error">
          {issue}
        </p>
      ))}
    </li>
  );
}

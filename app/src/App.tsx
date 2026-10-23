import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@tasktogether/service/contracts";
import { useEffect, useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { tasksApi, type Task } from "./api";
import "./index.css";

// The id comes from the row being edited, so the form validates the request minus id.
const updateTaskFormSchema = updateTaskRequestSchema.omit({ id: true });

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

// Validates with the same zod schema the backend uses, so bad input never leaves the browser.
function TaskForm<T>({
  initial,
  schema,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { title: string; description: string };
  schema: ZodType<T>;
  submitLabel: string;
  onSubmit: (v: T) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [issues, setIssues] = useState<string[]>([]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, description });
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return;
    }
    setIssues([]);
    await onSubmit(parsed.data);
    if (!initial) {
      setTitle("");
      setDescription("");
    }
  };

  return (
    <form onSubmit={submit} className="task-form">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={200}
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        maxLength={2000}
      />
      {issues.map((issue) => (
        <p key={issue} role="alert" className="error">
          {issue}
        </p>
      ))}
      <div>
        <button type="submit">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run an API action, then refresh the list; surface failures in the banner.
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setTasks(await tasksApi.list());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };

  useEffect(() => {
    run(() => Promise.resolve()).catch(() => {});
  }, []);

  return (
    <main className="app">
      <h1>Tasks</h1>
      {error && <p role="alert" className="error">{error}</p>}

      <TaskForm
        schema={createTaskRequestSchema}
        submitLabel="Add"
        onSubmit={(v) => run(() => tasksApi.create(v))}
      />

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            {editingId === task.id ? (
              <TaskForm
                initial={task}
                schema={updateTaskFormSchema}
                submitLabel="Save"
                onSubmit={async (v) => {
                  await run(() => tasksApi.update(task.id, v));
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <strong>{task.title}</strong>
                {task.description && <p>{task.description}</p>}
                <button onClick={() => setEditingId(task.id)}>Edit</button>
                <button
                  onClick={() => run(() => tasksApi.remove(task.id)).catch(() => {})}
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {tasks.length === 0 && <p>No tasks yet.</p>}
    </main>
  );
}

export default App;

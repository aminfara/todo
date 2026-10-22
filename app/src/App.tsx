import { useEffect, useState, type FormEvent } from "react";
import "./index.css";
import { tasksApi, type Task } from "./api";

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { title: string; description: string };
  submitLabel: string;
  onSubmit: (v: { title: string; description: string }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description });
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
        submitLabel="Add"
        onSubmit={(v) => run(() => tasksApi.create(v))}
      />

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            {editingId === task.id ? (
              <TaskForm
                initial={task}
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

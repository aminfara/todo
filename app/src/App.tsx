import { useEffect, useState, type FormEvent } from "react";
import "./index.css";
import { todosApi, type Todo } from "./api";

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

function TodoForm({
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
    <form onSubmit={submit} className="todo-form">
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run an API action, then refresh the list; surface failures in the banner.
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setTodos(await todosApi.list());
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
      <h1>Todos</h1>
      {error && <p role="alert" className="error">{error}</p>}

      <TodoForm
        submitLabel="Add"
        onSubmit={(v) => run(() => todosApi.create(v))}
      />

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}>
            {editingId === todo.id ? (
              <TodoForm
                initial={todo}
                submitLabel="Save"
                onSubmit={async (v) => {
                  await run(() => todosApi.update(todo.id, v));
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <strong>{todo.title}</strong>
                {todo.description && <p>{todo.description}</p>}
                <button onClick={() => setEditingId(todo.id)}>Edit</button>
                <button
                  onClick={() => run(() => todosApi.remove(todo.id)).catch(() => {})}
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {todos.length === 0 && <p>No todos yet.</p>}
    </main>
  );
}

export default App;

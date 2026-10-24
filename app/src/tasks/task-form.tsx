import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { TaskActionResult } from "./task-route";
import type { Task } from "./task-api";

export interface TaskFormProps {
  intent: "create" | "update";
  task?: Task;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
}

/** Posts to the tasks route's action and shows the issues it returns. */
export function TaskForm({ intent, task, submitLabel, onDone, onCancel }: TaskFormProps) {
  const fetcher = useFetcher<TaskActionResult>();
  const formRef = useRef<HTMLFormElement>(null);
  const issues = fetcher.data?.ok === false ? fetcher.data.issues : [];

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.ok) return;
    if (intent === "create") formRef.current?.reset();
    onDone?.();
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post" ref={formRef} className="task-form">
      <input type="hidden" name="intent" value={intent} />
      {task && <input type="hidden" name="id" value={task.id} />}
      <input name="title" defaultValue={task?.title} placeholder="Title" maxLength={200} required />
      <textarea name="description" defaultValue={task?.description} placeholder="Description" maxLength={2000} />
      {issues.map((issue) => (
        <p key={issue} role="alert" className="error">
          {issue}
        </p>
      ))}
      <div>
        <button type="submit" disabled={fetcher.state !== "idle"}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </fetcher.Form>
  );
}

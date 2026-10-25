import { isRouteErrorResponse, Link, useRevalidator, useRouteError } from "react-router";

/** Shown when a loader, an action or a render fails in a way the user cannot fix from the page. */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  // An unknown URL stays unknown; retrying only helps when loading or saving failed.
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Something went wrong";

  return (
    <main className="card max-w-xl mx-auto my-8">
      <div className="card-body">
        <h1 className="card-title text-3xl">Something went wrong</h1>
        <p role="alert" className="alert alert-error">
          {message}
        </p>
        {notFound ? (
          <Link to="/" className="link">
            Go to your tasks
          </Link>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state !== "idle"}
          >
            Try again
          </button>
        )}
      </div>
    </main>
  );
}

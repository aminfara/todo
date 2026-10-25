# App conventions

React 19 with React Router in data mode. Bun serves and bundles `src/index.html` as an HTML entrypoint (`bun run dev`, port 3000; the service runs on 3001). The app has no `Bun.serve`.

## Layout

- `src/frontend.tsx` is the composition root: it reads build-time config, creates the API clients and the router, and renders. Nothing else reads `process.env` or creates clients.
- One folder per feature, named by the plural (`src/tasks/`). Files and factories use the singular entity, as in the service module: `task-api.ts` exports `createTaskApi({ baseUrl })` over the typed `hc` client, `task-route.tsx` exports `createTaskRoute({ api })` returning the route object, and components sit beside them. Pass dependencies into the factories; do not import singletons.

## Data and errors

- Loaders read, actions write. Forms post with `useFetcher` and a hidden `intent`; React Router reloads loader data after a successful action, so do not refetch by hand or fetch in `useEffect`. A failed action does not reload, except a 404, which means the row is gone: the route's `shouldRevalidate` reloads the list then.
- Errors the user can fix (client-side validation, any 4xx) return from the action as `{ ok: false, issues }` with the response status and render beside the form. Everything else is thrown and reaches the route's `ErrorBoundary`. Never swallow a rejection without a fallback.
- Client-side validation uses the service's schemas for instant feedback only; the service validates again.

## Contract with the service

- Types and schemas, including the error response (`errorResponseSchema`), come from `@tasktogether/service/contracts`. The client is `hc<AppType>`, with `AppType` imported type-only from `@tasktogether/service`; never import a value from that entry. Wire types are the domain types after JSON (`JSONParsed<Task>`): dates are strings.
- `BUN_PUBLIC_*` variables are inlined when Bun bundles (see `bunfig.toml`); they are not runtime configuration.

## Testing

No app tests exist yet. Unit-test pure code such as `ok()` in `task-api.ts` with a fake `fetch`, and a route's loader and action by passing a fake api to `createTaskRoute`; leave whole journeys to end-to-end tests.

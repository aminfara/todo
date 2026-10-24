# App conventions

React 19 with React Router in data mode, bundled by Bun's HTML imports (`bun run dev` serves on port 3000; the service runs on 3001).

## Layout

- `src/frontend.tsx` is the composition root: it reads build-time config, creates the API clients and the router, and renders. Nothing else reads `process.env` or creates clients.
- One folder per feature (`src/tasks/`), files named by the singular entity like the service module: `<entity>-api.ts` (a `create<Feature>Api({ baseUrl })` factory over the typed `hc` client), `<entity>-route.tsx` (a `create<Feature>Route({ api })` factory returning the route object), and its components. Pass dependencies into the factories; do not import singletons.

## Data and errors

- Loaders read, actions write. Forms post with `useFetcher` and a hidden `intent`; React Router reloads loader data after a successful action, so do not refetch by hand or fetch in `useEffect`.
- Errors the user can fix (client-side validation, any 4xx) return from the action as `{ ok: false, issues }` with the response status and render beside the form. Everything else is thrown and reaches the route's `ErrorBoundary`. Never swallow a rejection without a fallback.
- Client-side validation uses the service's schemas for instant feedback only; the service validates again.

## Contract with the service

- Types and schemas come from `@tasktogether/service/contracts`, and the client is `hc<AppType>`. Wire types are the domain types after JSON (`JSONParsed<Task>`): dates are strings.
- `BUN_PUBLIC_*` variables are inlined when Bun bundles (see `bunfig.toml`); they are not runtime configuration.

# Service conventions

Hono on Bun. Prefer a Hono, Bun or zod facility over a hand-rolled one.

## Layout

```
src/
  main.ts  app.ts  container.ts  request-scope.ts   entry, HTTP app, composition root, per-request scope
  index.ts                                          type-only AppType for the app package
  contracts.ts                                      browser-safe re-export of each module's contracts
  config.ts  logger.ts  errors.ts  id.ts  common-types.ts  testing.ts
  validation.ts  route-input.ts  error-contracts.ts   validate() for the domain, hc typing for routes, the error response shape
  database.ts  migrate.ts                           Drizzle on Bun SQL; the release migration step
  modules/<name>/
    index.ts             public API for server code
    <name>-contracts.ts  public API for the browser: schemas and types only
    <name>-models.ts  <name>-domain.ts  <name>-service.ts  <name>-repo.ts  <name>-routes.ts  <name>-errors.ts
    <name>-schema.ts     the module's Drizzle tables; only its repo touches them
    <name>-testing.ts    test doubles for the module's public API, exported by index.ts
drizzle/                 generated SQL migrations, committed
```

- Code outside a module imports only its `index.ts`; `src/contracts.ts` is the one importer of `<name>-contracts.ts`. Other modules call the service, never the repo. When a second module lands, add an architecture test for this, since TypeScript cannot make files package-private.
- All wiring happens in `container.ts`: plain code in dependency order, no DI framework. Overrides replace a module for tests or another environment, and the container disposes only what it created (`AsyncDisposableStack`).
- Everything outside `modules/` is generic: no entity names, field rules or test doubles for one module. Relative imports only: the app type-checks this package and cannot resolve aliases.

## Operations

- Factories, not classes; errors are the exception and subclass `errors.ts`. Factories and domain functions take one object argument (a parameters object, or the request when it is the only input); service methods take `(request, context?)`.
- A service method is a verb taking one request and an optional `context`, and returning `{ result }`: `get({ id }, { logger })`. The request is domain data; `context` holds per-call information (request logger, later the user). Schemas and types carry the entity name: `getTaskRequestSchema`, `GetTaskRequest`.
- Route handlers build the context from `c.var.scope`. The service's own `logger` dependency is the fallback.
- Pure decisions (validation, building and changing an entity) live in `<name>-domain.ts`; the service does the I/O around them.

## Validation and output

- Every request is validated once, before any I/O, with `validate(schema, request)`: inside the domain function when one builds or changes the entity, otherwise in the service method. Every caller gets the same rules.
- Routes declare the contract with `input(target, schema)` from `route-input.ts`. It types `hc` and `c.req.valid` but does not validate. `validate` lives in `validation.ts`, so the domain never imports Hono. Each route splits its operation's request schema by where the fields arrive: the id from the path, the rest from the body; the path wins. A body sent without `content-type: application/json` reaches the service empty.
- zod keeps an explicit `undefined` as a present key. Rules that count supplied fields must ignore it.
- Routes parse every response with its response schema before `c.json`. zod strips unknown keys, so nothing outside the schema leaves the API.

## Types and errors

- Zod schemas are the source of truth; derive request and response schemas from the entity with `pick`, `omit`, `partial`. Request types are `z.input`, response types `z.output`. Ids are branded (`TaskId`).
- An error's HTTP status is its category. Errors subclass the generic HTTP errors in `errors.ts` by meaning (`EmptyTaskUpdateError` is a `BadRequestError`) and live beside the code that throws them. Only `app.onError` and `app.notFound` turn errors into responses, and their body must satisfy `ErrorResponse` (`error-contracts.ts`, shared with the app). Unexpected errors and every 5xx return a generic message; the real one is only logged.

## Persistence

- Postgres through Drizzle. Production and dev use Bun's SQL driver (`drizzle-orm/bun-sql`); tests use PGlite, an in-memory Postgres. Repos depend on the `Db` type in `database.ts`, which both drivers satisfy.
- Change a `<name>-schema.ts`, then run `bun run db:generate` in `service/` and commit the migration.
- Production never migrates on start: the release runs `bun run db:migrate` in `service/` once, and the service refuses to start (`DatabaseNotMigratedError`) while a migration is pending. Dev applies pending migrations on start; tests migrate PGlite once.
- Repos trust rows rather than parsing them: the service validated every entity before saving it and the columns enforce the types. Map columns, restore the branded id with a type assertion, and keep columns such as `seq` (insertion order) inside the repo.
- Dev Postgres runs in Podman: `bun run db:up` at the repo root starts the Podman machine if needed, then `compose.yaml`.

## Config, logging, lifecycle

- `loadConfig({ env })` parses env vars into a frozen object with no defaults in code. CORS allows only `TASKTOGETHER_CORS_ORIGIN`. Prefix vars `TASKTOGETHER_` (except `NODE_ENV`, `PORT`), document them in `.env.example`, and log config only through `getPrintableConfig`.
- pino: `app.onError` and `app.notFound` log 4xx at `warn` and 5xx at `error`; one "request completed" line per request. Request ids come from `hono/request-id`.
- Dev uses `bun --watch`; `--hot` re-runs `Bun.serve` and conflicts on the port. `--watch` does not reload `.env`; restart the service after changing it.

## Testing

- Domain rules and validation: unit tests on `<name>-domain.ts`. Use cases: service tests with the Drizzle repo on PGlite and injected `now` and `newId`. HTTP boundary: `src/app.test.ts` through `testClient`, which types requests and responses from the routes.
- `<name>-repo.test.ts` tests the Drizzle repo on PGlite. There is no in-memory repo: every test that stores data uses PGlite. To fake a failure or odd output, override the repo with `stubTaskRepo({ ... })` from the task module (`task-testing.ts`, exported by its `index.ts`), whose unstubbed methods throw.
- Each test file creates one PGlite with `createTestDatabase` (a clone of one migrated template, about 100 ms) and calls `resetDatabase` before each test (a few ms). Repo and service tests pass `database.db` to the factories; HTTP and container tests pass the database to `createTestContainer({ database })`, and wiring a container per test is cheap. Dispose every container and database a test file creates in `afterEach` / `afterAll`.
- `await` every `expect(...).rejects`. Use a well-formed unknown id for 404 and a malformed one for 400.

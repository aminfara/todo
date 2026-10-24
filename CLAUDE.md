# tasktogether

Bun monorepo kept as a template: `app/` is the React frontend, `service/` the Hono backend. Each has its own CLAUDE.md with its conventions.

Use Bun for everything: `bun install` / `bun add` for packages, `bun run dev` for dev servers, `bun test` for tests, `bun check` for types (`bun run typecheck` at the root checks every package) and `bun build` for bundles. Do not add npm, node, vite, jest or dotenv; Bun loads `.env` itself.

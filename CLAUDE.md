# tasktogether

Bun monorepo kept as a template: `app/` is the React frontend, `service/` the Hono backend. Each has its own CLAUDE.md with its conventions.

Use Bun for everything: `bun install` / `bun add` for packages, `bun test` for tests, and `bun run typecheck` at the root to check every package (`bun check` inside one). Format with `bun fmt` (width 100, set in the root `bunfig.toml`); `bun fmt --check` verifies without writing. Do not add npm, node, vite, jest or dotenv; Bun loads each package's `.env` itself.

First run: copy `app/.env.example` and `service/.env.example` to `.env` beside them (config has no defaults, so both packages stop without them), start Postgres with `bun run db:up`, then `bun run dev` starts both packages. Bundle the app with `bun run build` in `app/`, which runs `build.ts` so the Tailwind and daisyUI plugin applies; a bare `bun build` skips both that and the `BUN_PUBLIC_*` inlining, and the bundle fails in the browser.

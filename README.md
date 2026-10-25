# tasktogether

A fullstack task app, kept as a template for new projects. Bun monorepo (Bun >= 1.4).

| Workspace | Purpose |
| --- | --- |
| `@tasktogether/app` | Frontend |
| `@tasktogether/service` | Backend |

```bash
bun install
cp app/.env.example app/.env             # config has no defaults: both packages stop without a .env
cp service/.env.example service/.env
bun run db:up                            # dev Postgres in Podman
bun run dev                              # runs every workspace's dev script
bun run typecheck
bun test
```

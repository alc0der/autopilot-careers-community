# Autopilot Careers Monorepo

## Structure
- `packages/fetcher` — Job posting fetcher (MCP server + CLI)
- `packages/renderer` — Resume PDF renderer (MCP server + CLI)
- `packages/bullet-embeddings` — Bullet trust signals via Vectra + Ollama (MCP server)
- `packages/db` — Career data: resumes, job descriptions, journal
- `packages/claude-marketplace` — Claude Code write-resume plugin
- `docs/` — Structurizr architecture diagrams

## Package Management
- pnpm workspaces + Turborepo
- `pnpm build` / `pnpm test` / `pnpm typecheck` from root

## Troubleshooting Skills
If facing issues with the write-resume plugin or any of its skills, STOP.
Then, spawn an AI agents team with package maintainers:
- Fetcher Maintainer: authorized to edit packages/fetcher
- Renderer Maintainer: authorized to edit packages/renderer
- Embeddings Maintainer: authorized to edit packages/bullet-embeddings
Each maintainer should try to keep the best interest of its package.

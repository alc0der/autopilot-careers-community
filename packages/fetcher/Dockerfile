# Build context: repo root
# Build: docker build -f packages/fetcher/Dockerfile -t autopilot/fetcher .

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/fetcher/package.json packages/fetcher/
COPY packages/renderer/package.json packages/renderer/
COPY packages/db/package.json packages/db/
COPY packages/bullet-embeddings/package.json packages/bullet-embeddings/

RUN pnpm install --frozen-lockfile --filter @autopilot/fetcher

COPY packages/fetcher/ packages/fetcher/

RUN pnpm --filter @autopilot/fetcher build

# pnpm deploy produces a flat node_modules (including optional deps)
RUN pnpm --filter @autopilot/fetcher deploy --prod --legacy /deploy

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV MCP_TRANSPORT=http \
    MCP_PORT=3001

EXPOSE 3001

WORKDIR /app

COPY --from=builder /deploy .

# pnpm deploy copies package files including compiled dist/
COPY --from=builder /app/packages/fetcher/dist ./dist

ENTRYPOINT ["node", "dist/mcp.js"]

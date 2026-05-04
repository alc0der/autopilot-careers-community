# Build context: repo root
# Build: docker build -f packages/bullet-embeddings/Dockerfile -t autopilot/bullet-embeddings .
#
# Runtime requirements:
#   - Ollama must be accessible; set OLLAMA_BASE_URL
#       Apple Container / Docker: http://host.containers.internal:11434 (default)
#   - Mount a persistent volume at /data for the Vectra vector indexes
#
# Example:
#   docker run -i --rm \
#     -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
#     -v bullet-embeddings-data:/data \
#     autopilot/bullet-embeddings

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/bullet-embeddings/package.json packages/bullet-embeddings/
COPY packages/fetcher/package.json packages/fetcher/
COPY packages/renderer/package.json packages/renderer/
COPY packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile --filter @autopilot/bullet-embeddings

COPY packages/bullet-embeddings/ packages/bullet-embeddings/

RUN pnpm --filter @autopilot/bullet-embeddings build

RUN pnpm --filter @autopilot/bullet-embeddings deploy --prod --legacy --config.optional=false /deploy

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

COPY --from=builder /deploy .
COPY --from=builder /app/packages/bullet-embeddings/dist ./dist

# OLLAMA_BASE_URL: address of the Ollama server (host.containers.internal works for
#                  both Apple Container and Docker Desktop host networking)
# BULLET_DATA_DIR: where Vectra indexes are persisted (mount a volume here)
ENV OLLAMA_BASE_URL=http://host.containers.internal:11434 \
    BULLET_DATA_DIR=/data \
    MCP_TRANSPORT=http \
    MCP_PORT=3003

EXPOSE 3003

VOLUME ["/data"]

ENTRYPOINT ["node", "dist/server.js"]

# Build context: repo root
# Build: docker build -f packages/renderer/Dockerfile -t autopilot/renderer .

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Workspace manifests first — changes here invalidate the install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/renderer/package.json packages/renderer/
COPY packages/fetcher/package.json packages/fetcher/
COPY packages/db/package.json packages/db/
COPY packages/bullet-embeddings/package.json packages/bullet-embeddings/

# Skip Chromium download — runtime uses system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN pnpm install --frozen-lockfile --filter @autopilot/renderer

# Now copy source and build
COPY packages/renderer/ packages/renderer/

RUN pnpm --filter @autopilot/renderer build

# Create a self-contained deployment directory (flat node_modules, no symlinks)
RUN pnpm --filter @autopilot/renderer deploy --prod --legacy /deploy

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Chromium + its shared-library dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdrm2 \
      libgbm1 \
      libnss3 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    MCP_TRANSPORT=http \
    MCP_PORT=3002

EXPOSE 3002

WORKDIR /app

# pnpm deploy gives us: package.json + node_modules (flat) + all package files
COPY --from=builder /deploy .

# The bundle is built into packages/renderer/bundle/ then copied by pnpm deploy;
# if pnpm deploy doesn't include it, copy explicitly:
COPY --from=builder /app/packages/renderer/bundle ./bundle

ENTRYPOINT ["node", "bundle/oh-my-cv-render-mcp.js"]

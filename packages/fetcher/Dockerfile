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

# Avoid downloading a bundled Chromium — we use the system one at runtime
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN pnpm install --frozen-lockfile --filter @autopilot/fetcher

COPY packages/fetcher/ packages/fetcher/

RUN pnpm --filter @autopilot/fetcher build

# pnpm deploy produces a flat node_modules (including optional deps)
RUN pnpm --filter @autopilot/fetcher deploy --prod --legacy /deploy

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Chromium is only needed for the Puppeteer fallback path (non-LinkedIn URLs or
# rate-limited requests). The primary LinkedIn path uses a REST API and is fine
# without a browser.
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
    CHROME_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_USER_DATA_DIR=/tmp/chrome-user-data \
    MCP_TRANSPORT=http \
    MCP_PORT=3001

EXPOSE 3001

WORKDIR /app

COPY --from=builder /deploy .

# pnpm deploy copies package files including compiled dist/
COPY --from=builder /app/packages/fetcher/dist ./dist

ENTRYPOINT ["node", "dist/mcp.js"]

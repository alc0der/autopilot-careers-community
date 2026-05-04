# 5. Per-user namespacing for the bullet-embeddings vector store

Date: 2026-05-04

## Status

Accepted

## Context

`bullet-embeddings` is moving toward hosted use (`mcp.autopilot.careers`, see [ADR 0004](0004-inline-markdown-exchange-for-claude-cowork.md)), but the vector store it sits on assumes one user.

Today `src/lib/vectra.ts` opens two module-level Vectra `LocalIndex` singletons — `achievements` and `bullets` — rooted at `BULLET_DATA_DIR` (default `packages/bullet-embeddings/data/`). Every MCP request created by `app.post("/mcp", …)` resolves through those same two singletons. No record carries a user identifier, and no tool (`harvest`, `embed_achievement`, `query`, `feedback`, `stats`) accepts or filters on one. In stdio and local-container modes that is fine — there is exactly one developer per process. In hosted mode it means anyone reaching the endpoint reads and writes everyone else's bullets.

The constraints that shape the fix:

- **Vectra is file-per-directory.** An index directory is one writer, one JSON file; concurrency is per directory, not per record. Any namespacing scheme has to live above that boundary.
- **No cross-user use case.** A user's resume bullets, achievements, and human feedback signals are private. We do not currently want shared corpora, cross-user dedup, or aggregate analytics.
- **The MCP tool contracts were just stabilised in 0004.** Adding a `user_id` argument to every tool would be a second contract churn within days and pushes the auth boundary into every caller.
- **We want this quick.** A pgvector/Qdrant migration would solve it cleanly but is weeks of work and unnecessary at current scale.

## Decision

Namespace by directory, identify the user out-of-band, and keep the MCP contract unchanged.

### Storage layout

Replace the two module-level singletons with a per-user cache:

```
<BULLET_DATA_DIR>/<userId>/achievements/index.json
<BULLET_DATA_DIR>/<userId>/bullets/index.json
```

`lib/vectra.ts` exposes `getAchievementsIndex(userId)` and `getBulletsIndex(userId)` backed by a `Map<userId, LocalIndex>`. Existing data migrates once by moving `data/{achievements,bullets}` into `data/<seedUserId>/`.

### User identity

`userId` enters the server, not the tool contract:

- **HTTP transport.** The hosted deployment sits behind an auth proxy that has already authenticated the caller; the proxy forwards the principal in a request header (e.g. `X-Autopilot-User`). `app.post("/mcp", …)` reads it and passes it into a refactored `createServer(userId)`. Requests without a principal are rejected with HTTP 401. The proxy itself is out of scope for this ADR.
- **stdio transport.** `userId` comes from `BULLET_USER_ID` (default `local`), giving dev parity with no auth ceremony.

`createServer(userId)` threads the id into each `register*Tool` via closure, so individual tool handlers call `getBulletsIndex(userId)` instead of `getBulletsIndex()`. The MCP-visible tool schemas do not change.

### Rejected alternatives

- **Single index, `user_id` metadata filter on every query.** Keeps one directory but turns isolation into a discipline problem: every `listItems`, `queryItems`, and stats aggregation has to remember the filter, and one missing filter leaks across tenants. Vectra also has no native partition concept, so `stats` would scan all users.
- **Migrate to pgvector/Qdrant now.** Correct end state but not a quick path. This ADR explicitly defers it.

## Consequences

- **Isolation by construction.** A tool handler that forgets a filter cannot reach another user — the wrong index simply isn't open.
- **No MCP contract change.** Skill, CoWork, Codex, and stdio callers are unchanged. ADR 0004's tool surface is preserved.
- **Auth is delegated.** Hosted multi-user is not actually live until a proxy populates the principal header; until then, the hosted server should run with a single seeded `userId` or stay stdio-only.
- **Memory grows with active users.** Each cached `LocalIndex` keeps its vectors resident. Tens of users is comfortable; revisit when active users approach ~100 or any single index exceeds ~50 MB.
- **No cross-user analytics.** `stats` returns per-user numbers only. A future "most reused bullet across all users" query would need to walk every namespace; we accept that trade.
- **Clean migration path to a real multi-tenant store.** When pgvector/Qdrant becomes worthwhile, `userId` is already threaded through; the change is confined to `lib/vectra.ts`.

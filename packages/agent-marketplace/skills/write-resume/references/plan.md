### Plan

1. Read annotated job description
1. Read previous resumes in `resumes` and note titles
1. Construct a career progression plan (a story)
  - Read `./techniques/career-narrative.md` if it exists and follow its rules for career path focus, track separation, and demotion avoidance.
  - If absent, construct a coherent progression story using your best judgment.
1. Read achievements journal (`journal/achievements.yaml`)
   - Filter achievements by relevance to target role
   - Prioritize achievements marked `reviewed: true` (already refined)
   - Achievements with `job_id` can be mapped to specific positions
   - Nominate the most impactful achievements for inclusion in AI yaml
1. **Query embeddings for bullet intelligence** (skip if `bullet-embeddings` MCP not available)

   **Phase A — Identify points to cover:**
   Based on the annotated JD highlights and the career progression plan from step 3, list all key points/themes the resume must demonstrate (e.g., "technical leadership", "AI/ML delivery", "team scaling", "cross-functional collaboration"). Each point is a focused semantic theme derived from JD requirements.

   **Phase B — Parallel queries:**
   Fire all queries in parallel — one `mcp__bullet-embeddings__query` call per point, each with `text` set to a focused description of that point, `top: 5`.
   Example:
   ```
   query(text="engineering team leadership mentorship performance management", top=5)
   query(text="AI generative systems production delivery LLM integration", top=5)
   query(text="microservices architecture scalability code quality reviews", top=5)
   ```

   **Phase C — Selection & elimination:**
   Once all results are back, present a combined results table showing:
   - Which point each result matched
   - Trust signals: `similarity`, `grounded`, `reuse_count`, `feedback`
   - Overlap — same bullet appearing across multiple point queries

   Then apply selection/elimination:
   1. **Deduplicate** — If the same bullet cluster appears in multiple point queries, assign it to the point where it scored highest
   2. **Select** — For each point, pick the best articulation:
      - `[reuse]` — grounded + reuse_count >= 2 + no negative feedback → use as-is
      - `[rephrase]` — grounded but needs adaptation for this JD
      - `[achievement]` — derive directly from a verified achievement
      - `[new]` — generate fresh (flag if no supporting achievement exists)
   3. **Eliminate** — Drop bullets with `feedback: exaggerated`, duplicates, or low-relevance results
   4. **Assign to positions** — Map selected bullets to job positions based on `job_id` and recency
   5. **Gap check** — If any point has no good candidate, mark it `[new]` for generation

   Decision guidance:
   - **Grounded + high reuse + no negative feedback** → reuse confidently
   - **Grounded + low reuse** → good candidate, rephrase for JD
   - **Ungrounded + high reuse** → likely true but unverified, use with care
   - **Ungrounded + low reuse** → weak signal, generate fresh instead
   - **feedback: exaggerated** → never reuse
   - **feedback: great** → strong reuse candidate

   Present the final bullet plan per position showing: bullet text, source tag, which query/point it came from, and what it was derived from.
1. **Read feedback files** — Scan `feedback/` directory for relevant feedback documents.
   These contain ground-truth corrections about the user's experience (e.g., which tools were used at which company, what was exaggerated, what was a prototype vs production).
   Apply these constraints when planning bullets — they override assumptions from prior resumes or embeddings.
1. Construct multiple plans and select the best one
1. Read `./techniques/allowed-title-whitelist.md` if it exists. Use its title list to constrain the most recent role's title selection. If absent, do not constrain titles beyond what `base.yaml` shows.

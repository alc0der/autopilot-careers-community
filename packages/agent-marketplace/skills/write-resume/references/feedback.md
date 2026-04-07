### /Feedback

Capture corrections, clarifications, and per-bullet signals after reviewing a generated resume. Produces a ground-truth feedback document and applies signals to the embeddings system.

#### Usage

- `/feedback` — start an interactive feedback session after reviewing a resume

#### Phase 1: Capture

Interview the user about what needs correcting or clarifying. Probe for:

- **Corrections** — factual errors, wrong attributions (tool X was at company Y, not Z)
- **Clarifications** — nuance the AI missed (e.g., "Grafana was for analytics, not monitoring")
- **Signals** — bullets that were great, exaggerated, weak, or need evidence
- **Missing context** — achievements or details the user wants captured for next time

Once the user signals they are done, synthesize the conversation into a feedback file.

##### File Format

Write to `feedback/YYYYMMDD_<topic_slug>.md` where `<topic_slug>` is a short snake_case description of the dominant theme:

```markdown
# Feedback: <Title>
Date: YYYY-MM-DD

## Context
<What was being reviewed — resume file, target role, what prompted this session>

## Clarifications
### <Topic>
<Prose explanation of the correction or clarification>

## Action Items
- <Specific actionable item, referencing signal if applicable>
```

Preserve the user's own words as much as possible — the file is ground truth, not a summary.

#### Phase 2: Act

Process each action item from the feedback file:

1. **Per-bullet signals** — For items that map to a specific bullet and signal, call `mcp__bullet-embeddings__feedback` with `search` set to the bullet text and the appropriate `signal`
2. **New achievements** — If the feedback surfaces an achievement worth recording, suggest running the `/achievement` command
3. **Summary** — Present what was recorded:
   - Feedback file path
   - Signals applied (bullet + signal pairs)
   - Suggested follow-ups (achievements to journal, resume regeneration)

#### Valid Signals

| Signal | Meaning | Effect on future generation |
|--------|---------|----------------------------|
| `great` | Accurate, impactful, keep reusing | Strong reuse candidate |
| `exaggerated` | Overstates reality | Never reuse — generate fresh |
| `needs_evidence` | Plausible but unverified | Use only if strongly relevant, flag it |
| `weak` | Vague, generic | Avoid, generate fresh |

#### When to Use

- After reviewing a generated resume (suggested in step 11 of /execute)
- When the user realizes a past resume had inaccuracies
- During interview prep when reflecting on resume content

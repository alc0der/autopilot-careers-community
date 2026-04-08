---
name: page-layout
summary: One-page resume with graduated bullet counts and a trim cascade when content overflows.
category: layout
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

Your resume will be constrained to a page limit. Bullet counts graduate by job recency: more bullets for recent roles, fewer for older ones. If the rendered resume exceeds the page limit, a trim cascade removes content starting from the oldest job.

**Customize:**
- How many pages should the resume be? (default: 1)
- Do you want graduated bullet counts, or a flat count per job? If graduated, what counts? (default: 5, 4, 3, 2)
- Should the oldest jobs be candidates for complete omission when space is tight?

## Instructions

The resume must fit on **{{pages}} page(s)**. Optimize for this from the start using graduated bullet counts, but do not aggressively cut content on the first pass.

### Bullet Counts

Use graduated bullet counts by job recency (most recent job listed first):
- Job 1 (most recent): {{job1_bullets}} bullets
- Job 2: {{job2_bullets}} bullets
- Job 3: {{job3_bullets}} bullets
- Job 4+: {{job4_bullets}} bullets
- Oldest 1-2 jobs: {{oldest_policy}}

### Page-Fit Verification Loop

After rendering, check `pageCount` from the render tool's JSON response:
- If `pageCount` is **{{pages}}** or fewer, done — proceed to the next step.
- If over, trim content and re-render. Apply these reductions in order, one at a time, re-rendering after each until it fits:
  1. Remove all bullets from the oldest job (or omit it entirely)
  2. Remove all bullets from the second-oldest job (or omit it)
  3. Remove 1 bullet from each remaining job, starting from the oldest
  4. Shorten the skills list (remove least-relevant skills)
- Re-run the render script and PDF render after each trim, then re-check page count.
- **Max 4 iterations** to avoid infinite loops. If still over after 4 rounds, present the result and ask the user for guidance.

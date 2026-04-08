---
name: linkedin-grounding
summary: Ground base.yaml from LinkedIn data export with configurable strictness and promotion limits.
category: data-source
conflicts-with: [job-title-lock, allowed-title-whitelist]
default: false
version: 1
---

## Onboarding Prompt

This technique grounds your `base.yaml` from a LinkedIn data export, so your resume's job history stays in sync with your public profile. It also controls how strictly resumes must follow that grounded data.

**Strictness levels:**
- **Strict** (default) — titles and dates must match base.yaml exactly. To change them, update LinkedIn and re-ground.
- **Moderate** — titles can be adjusted for a target role with your approval. Dates stay exact.
- **Loose** — titles and dates can be freely adjusted. Job structure can be reorganized.

**Promotion limit:** Companies with many title progressions are collapsed to a maximum number of entries (default: 2). The oldest kept entry's date range extends to cover collapsed roles.

**Requirements:** A LinkedIn data export with at least **Positions** selected. Request it at: Settings > Data Privacy > Get a copy of your data > select **Positions** (and optionally **Profile**, **Education**). LinkedIn emails a download link within 10 minutes to 2 hours.

**Customize:**
- Strictness level? (default: strict)
- Maximum promotions per company? (default: 2)
- Your LinkedIn profile URL? (default: derived from contact.yaml)

## Instructions

# LinkedIn Grounding

## Config
- **LinkedIn URL**: {{linkedin_url}}
- **Strictness**: {{strictness}}
- **Promotion limit**: {{promotion_limit}} per company
- **Last sync**: {{last_sync_date}}

## Strictness Rules

### Strict (default)
- Job titles in resumes **must match** base.yaml exactly — no rewording, no creative alternatives
- Dates **must match** base.yaml exactly
- Only jobs present in base.yaml may appear on the resume
- To change a title or date, the user must update their LinkedIn and re-ground

### Moderate
- Job titles may be adjusted for a target role **with explicit user approval**
- Dates must match base.yaml exactly
- Only base.yaml jobs may appear, but some may be omitted

### Loose
- Job titles may be freely adjusted to fit the target role
- Dates are approximate — minor adjustments allowed
- Job structure can be reorganized

## When to Re-sync
If the user mentions updating their LinkedIn, ask if they have a new export.
Suggest: Settings > Data Privacy > Get a copy of your data > select "Positions".

## Execution-Time Behavior
- Enforce the strictness level above for all resume generation
- Do not split a single base.yaml entry into multiple roles (promotion limit already applied)
- If the resume plan requires roles not in base.yaml, flag it to the user

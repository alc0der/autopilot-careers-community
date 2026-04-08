---
name: job-title-lock
summary: Prevent modification of job titles without explicit user approval.
category: content
conflicts-with: [linkedin-grounding]
default: true
deprecated: true
recommended-replacement: linkedin-grounding
version: 1
---

## Onboarding Prompt

> **Note:** Consider using **linkedin-grounding** instead — it provides stricter data grounding from your LinkedIn profile, including title locking.

Job titles in the resume come from `base.yaml` and should reflect what's on your LinkedIn profile. By default, the skill will not modify them — if a title change seems beneficial for a target role, it asks you first.

**Customize:**
- Should job titles be locked (require your approval to change)? (default: yes)
- Or should the skill freely adjust titles to better match target roles?

## Instructions

**Do not modify job titles** — they must stay consistent with LinkedIn and `base.yaml`. If a title change seems beneficial for the target role, ask the user for approval first before making the change.

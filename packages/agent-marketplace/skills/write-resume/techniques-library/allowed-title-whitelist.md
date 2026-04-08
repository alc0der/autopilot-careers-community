---
name: allowed-title-whitelist
summary: Restrict the most recent role's title to a pre-approved list.
category: content
conflicts-with: [linkedin-grounding]
default: true
deprecated: true
recommended-replacement: linkedin-grounding
version: 1
---

## Onboarding Prompt

> **Note:** Consider using **linkedin-grounding** instead — in strict mode, titles are locked to your LinkedIn profile, making a whitelist unnecessary.

For the most recent position on your resume, the skill constrains the title to a whitelist of acceptable options. This prevents the AI from inventing a title that doesn't match your actual experience.

**Default whitelist (from most preferable to lowest):**
1. Senior Engineering Manager
2. Senior Technical Lead
3. Solutions Architect
4. Technical Program Manager
5. Senior Full Stack Engineer
6. Senior Backend Engineer
7. Senior Frontend Engineer

**Customize:**
- Edit this list — add, remove, or reorder titles to match your background.
- Or remove this technique entirely if you don't want title constraints.

## Instructions

The allowed job titles for the most recent occupation (from most preferable to lowest):
{{#titles}}
- {{.}}
{{/titles}}

When planning the resume, select the most recent role's displayed title from this list. Pick the highest-ranked title that accurately represents the user's actual role and experience. Do not use a title outside this list without user approval.

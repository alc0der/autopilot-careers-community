---
name: dual-tagline
summary: Restrict the resume tagline to a predefined set of options.
category: content
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

The resume header includes a tagline under your name. By default, the skill picks from two options based on the target role's focus:
- **"EM | Founding Eng."** — for people-focused roles (Engineering Manager, etc.)
- **"Sr. Eng. Manager"** — for technical leadership roles (Tech Lead, Staff Engineer, etc.)

**Customize:**
- What taglines represent you? You can keep the defaults, modify them, or provide your own list.
- Should the tagline vary by role type, or use a single fixed tagline?

## Instructions

When writing the `basics.label` field in the AI overlay YAML, pick the best fit for the target role from this list:

{{#taglines}}
- **"{{tagline}}"** — {{when}}
{{/taglines}}

Do not invent taglines outside this list unless none fit the target role — in that case, ask the user.

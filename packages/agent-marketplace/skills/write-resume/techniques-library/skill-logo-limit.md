---
name: skill-logo-limit
summary: Limit the number of technology logos in the skills section.
category: layout
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

The skills section can include technology logos (Iconify icons) next to skill names. Too many logos look cluttered; too few miss the visual impact.

**Customize:**
- How many logos should appear in the skills section? (default: 2-5)
- Any specific technologies that should always get a logo?

## Instructions

When decorating skills with icon shortcodes (`:icon-set--icon-name:`, e.g. `:vscode-icons--file-type-aws: AWS`):
- Keep the total logo count between **{{min_logos}}** and **{{max_logos}}**.
- Prioritize logos for the most recognizable and relevant technologies.
{{#always_logo}}
- Always include a logo for: {{always_logo}}
{{/always_logo}}

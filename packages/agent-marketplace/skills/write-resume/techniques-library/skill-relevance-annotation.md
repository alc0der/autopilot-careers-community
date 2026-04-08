---
name: skill-relevance-annotation
summary: Highlight relevant skills in JDs and annotate with experience context.
category: workflow
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

During JD analysis, the skill highlights keywords that match your experience and adds inline comments explaining the connection. This produces an annotated JD that maps requirements to your background.

**Example:**
```
... experienced in ==scaling teams==%% scaled team in Beno as Engineering Manager %%
```

**Customize:**
- Do you want this annotation style? (default: yes)
- Should annotations reference specific companies/roles, or keep them generic?

## Instructions

When annotating the job description:
- **Highlight** relevant skills from previous resumes using markdown highlight syntax (`==keyword==`).
- **Write a short comment** after each highlight explaining how the user's experience relates to the keyword, using Obsidian-style comments (`%% comment %%`).
  - Example: `... experienced in ==scaling teams==%% scaled team in Beno as Engineering Manager %%`
- **Never** highlight or comment on sections already marked as `%% non-relevant %%`.

---
name: jd-normalization
summary: Strip markdown formatting from JDs and replace irrelevant sections with markers.
category: workflow
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

When analyzing a job description, the skill normalizes it by removing markdown formatting and replacing irrelevant sections (company culture, benefits, etc.) with `%% non-relevant %%` markers. This focuses the analysis on actionable requirements.

**Customize:**
- Should irrelevant sections be stripped or just dimmed? (default: replaced with %% non-relevant %%)
- Which sections do you consider irrelevant? (default: company description, culture, benefits)
- Should the original formatting be preserved? (default: no — bold/italic/underline removed)

## Instructions

When creating an annotated version of the job description:
- **Never change a word** from the original text.
- **Remove markdown formatting**: bold, italic, underline, and strikethrough from the original Job Description.
- **Identify irrelevant sections**: Ignore any information under headings about the company itself, its culture, and benefits.
- **Replace** any irrelevant section or text with `%% non-relevant %%`.

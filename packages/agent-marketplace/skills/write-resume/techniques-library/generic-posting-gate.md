---
name: generic-posting-gate
summary: Flag vague or generic JDs and suggest using a generic resume instead.
category: workflow
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

After annotating a JD, the skill checks whether the posting is too vague to warrant a fully tailored resume. If most of the content was marked non-relevant and few skills were highlighted, it flags this and suggests using a generic resume instead.

**Customize:**
- Should the skill flag vague postings? (default: yes)
- Should it auto-proceed for LOW priority companies, or always ask? (default: auto-proceed for LOW, ask for HIGH)

## Instructions

After completing the JD annotation, review the result for vague or generic postings:
- If the ratio of `%% non-relevant %%` sections is very high relative to highlighted content, or if very few highlights were found, flag this to the user:
  > "This JD appears to be a generic talent pipeline posting with few specific requirements. Consider using a generic resume instead of a fully tailored one."
- Wait for the user to decide whether to continue with a tailored resume or switch to generic.
- **If priority is LOW**: skip this review and proceed automatically.
- **If priority is HIGH**: always wait for the user's decision.

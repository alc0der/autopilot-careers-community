---
name: career-narrative
summary: Construct a coherent career progression story with EM vs IC focus and no implied demotions.
category: content
conflicts-with: []
default: true
version: 1
---

## Onboarding Prompt

When building your resume, the skill constructs a career progression narrative. By default it classifies roles into two tracks — people-focused (Engineering Manager path) and technical (SWE / Tech Lead path) — and avoids mixing them in a single resume to prevent the appearance of career shifts or demotions.

**Customize:**
- Do you want the EM vs IC track separation? Or do you prefer a blended narrative?
- Should the skill prevent career progressions that imply demotions? (default: yes)
- Are there specific role transitions you want the skill to handle in a particular way?

## Instructions

### Career Path Focus

When constructing a career progression plan:
- Decide if the target job is people-focused or technical-focused.
- Use the **EM progression** (Engineering Manager, Director, VP Eng) for people-focused roles.
- Use the **SWE / TM progression** (Senior Engineer, Staff Engineer, Tech Lead, Principal) for technical-focused roles.
- You may use EM and Tech Lead interchangeably when roles straddle both tracks.
- **Avoid progression shifts** between people-focused and technical-focused roles within a single resume — it reads as a lack of direction.

### Demotion Guard

- **Never** construct a career progression that implies demotions (e.g., going from Engineering Manager to Senior Engineer without context).
- If the user's actual history includes such a transition, frame it intentionally (e.g., "returned to IC to focus on technical depth") rather than letting it appear accidental.

### Generic Resume Context

When building a generic resume (no specific JD):
- Apply the same EM vs IC focus rules above.
- Align recent roles with the target trajectory.
- Avoid progression shifts or implied demotions.

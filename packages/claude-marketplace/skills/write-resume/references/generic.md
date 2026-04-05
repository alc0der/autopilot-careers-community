## /Generic `[Role]` `[Company]`

Create a generic resume for a target role, optionally tailored for a specific company.

### 1. Research (if company specified)

Use web search to understand the target company:
- Company website and domain/industry
- Products or services they offer
- Technologies or methodologies they emphasize
- Recent news or company culture

### 2. Plan

Read previous resumes in `resumes` to understand career history.

Read achievements journal (`journal/achievements.yaml`):
- Filter achievements by relevance to target role
- Prioritize achievements marked `reviewed: true` (already refined)
- Achievements with `job_id` can be mapped to specific positions
- Nominate the most impactful achievements for inclusion in AI yaml

Construct a career progression story for the target role:
- Decide if target is people-focused (EM path) or technical (SWE/TM path)
- Align recent roles with target trajectory
- Avoid progression shifts or implied demotions

### 3. Interview (optional)

If needed, ask the user about:
- Recent projects or achievements not in sample resumes
- Specific skills relevant to the target role
- Preferences for emphasis areas

### 4. Execute

Follow [execute](execute.md) to generate AI YAML and render the resume.

**File naming:**
- YAML source: `resumes/YYYYMMDD_Generic_<Role>_ai.yaml`
- Rendered output: `rendered/YYYYMMDD_Generic_<Role>_Resume.md`

When writing achievements:
- For company-targeted: emphasize relevant domain experience
- For pure generic: highlight transferable skills and broad impact

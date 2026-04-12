# MCP Request / Response Samples

Real payloads captured from session `local_dca0321d` (2026-04-10).

## fetch_job

### Request

```json
{
  "url": "https://www.linkedin.com/jobs/view/4384190423/"
}
```

### Response (success)

The tool returns a single `text` content block containing Markdown with YAML frontmatter:

```markdown
---
rel:source: https://www.linkedin.com/jobs/view/4384190423/
type: specific-role
tags:
- jd
---

# Technology & AI Lead

**Company:** Energetech
**Location:** Dubai, United Arab Emirates

## Job Details

- **Seniority level:** Mid-Senior level
- **Employment type:** Full-time
- **Job function:** Information Technology
- **Industries:** Oil and Gas and Mining

## About Us

Energetech Trading DMCC is an integrated commodity trading and industrial
infrastructure business headquartered in Dubai ...
```

### Response (rate-limited)

When LinkedIn throttles requests, the tool returns `isError: true` with retry guidance:

```text
RATE_LIMITED: LinkedIn is throttling requests from this IP.
The job posting (https://www.linkedin.com/jobs/view/4384190423/) could not be fetched right now.

Suggested action: Wait 60 seconds, then call this tool again with the same arguments.
Do NOT fall back to a different method -- the rate limit is temporary.
```

## render_resume (local mode)

### Request

```json
{
  "input": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.md",
  "output": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.pdf",
  "metadata": {
    "title": "Ahmad Akilan - Energetech Technology & AI Lead",
    "author": "Ahmad Akilan",
    "subject": "Tailored for: Energetech - Technology & AI Lead",
    "keywords": ["Energetech", "Technology & AI Lead"]
  }
}
```

### Response (success)

```json
{
  "pdf": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.pdf",
  "pageCount": 1
}
```

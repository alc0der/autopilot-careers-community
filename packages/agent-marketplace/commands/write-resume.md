---
description: Write a resume tailored for a specific job posting
argument-hint: "<LinkedIn job URL>"
---

# Write Resume

Write a resume tailored to a specific job posting. Use the `write-resume` skill to handle the full workflow: fetch the job description, analyze requirements, match against the user's experience, and generate a targeted resume.

## Usage

```
/write-resume $ARGUMENTS
```

If the user provides a LinkedIn job URL or job ID, pass it directly to the skill. If no URL is provided, ask for one.

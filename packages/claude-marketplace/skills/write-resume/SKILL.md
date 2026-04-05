---
name: write-resume
description: Use this skill to write resumes or write cover letters. Resumes could be generic or tailored for a job description. The skill provides guide to effectively utilize job descriptions. When users share a LinkedIn job URL or job ID, use this skill to fetch the posting and begin the resume workflow.
metadata:
  version: 1.13.5
allowed-tools: Bash(jq:*) Bash(mustache:*) Bash(./scripts/render.sh:*) Bash(vale:*) mcp__linkedin-fetcher__fetch_job mcp__oh-my-cv-render__render_resume mcp__bullet-embeddings__harvest mcp__bullet-embeddings__query mcp__bullet-embeddings__feedback mcp__bullet-embeddings__embed_achievement mcp__bullet-embeddings__stats Read Write
---

# Resume Writer

This skill guides AI agents to create relevant and consistent resumes. The skill utilizes previous work done by the human or approved by human to synthesize a new generic resume or a tailored resume.

You are provided with previous resumes and job descriptions. Use these to understand my skillset, and how I apply to jobs. You may provided with the Job Description for these resumes as well.

## Setup

If tools are not yet installed, run the setup script from the plugin root:

```bash
./setup.sh
```

This installs jq and mustache into the plugin's `vendor/` directory, and verifies python3 + PyYAML are available. LinkedIn job fetching and resume rendering are handled by MCP tools (no local install needed).

## Plugin Config

User-configurable settings are declared in `plugin.json` under `userConfig`. Pass resolved values as environment variables when invoking scripts.

| Variable | Default | Description |
|----------|---------|-------------|
| `$TMP_DIR` | `.` | Directory for temporary files during rendering |

## Prerequisites

You must have the following files in your working directory:

### base.yaml
Contains your job history and education. This file serves as the "source of truth" for your resume with hardcoded data like job titles, companies, dates, and degrees.

Example structure:
```yaml
jobs:
  - id: company_role
    title: Job Title
    company: Company Name
    city: City, Country
    start_date: Jan 2020
    end_date: Present

education:
  - institution: University Name
    city: City
    degree: Degree Title
    start_date: "2013"
    end_date: "2017"

skill_groups:
  - category: Technical
  - category: Managerial
```

### contact.yaml
Contains your personal contact information. This data is merged into the resume template.

Example structure:
```yaml
name: Your Name
phone: +1-555-123-4567
email: you@example.com
github: yourusername
linkedin: yourlinkedin
website: https://yoursite.com
location: City, Country
visa: Work Authorization  # optional
```

## Workflow: Writing a Resume

### Tailored Resume

- [/fetch](references/fetch.md) (when the user provides a LinkedIn job URL or ID — normalization is automatic)
- [/priority](references/priority.md) (determine company priority)
- [/analyze](references/analyze.md)
- [/synthesize](references/synthesize.md)

### Generic Resume

- [/generic](references/generic.md)

## Workflow: Other Common Tasks

- [/critique](references/critique.md)
- [/cover](references/cover.md)

## Workflow: Maintenance

- [/harvest](references/harvest.md) — index bullets from a resume YAML into embeddings
- [/feedback](references/feedback.md) — capture corrections and clarifications as ground truth, apply per-bullet signals

## File Naming

### Resume Files (YAML source)

Resume source files are stored in `resumes/` and follow the pattern:

```
YYYYMMDD_<target>_<role>_ai.yaml
```

Where:
- `YYYYMMDD`: Date the resume was created (e.g., 20260202)
- `<target>`: Company name for tailored resumes, or "Generic" for generic resumes
- `<role>`: Job title/role (underscores replace spaces)
- `_ai.yaml`: Suffix indicating AI-generated YAML content

**Examples:**
- Tailored: `20250904_Alea_Health_CTO_ai.yaml`
- Generic: `20260202_Generic_Project_Manager_ai.yaml`

### Rendered Files (MD output)

Rendered markdown resumes are stored in `rendered/` and follow the pattern:

```
YYYYMMDD_<target>_<role>_Resume.md
```

**Examples:**
- `20260202_Generic_Project_Manager_Resume.md`
- `20250904_Alea_Health_CTO_Resume.md`

### Job Description Files

Job description files follow the pattern `<order>_<company>_<job title>_<suffix>`, where:
- `<order>`: Chronological order of job where 1 is the first one
- `<company>`: Name of the company
- `<job title>`: Job title
- `<suffix>`: One of:
  - `JD_Raw`: Job Description (as-is from source)
  - `JD`: Job Description after normalizing
  - `JD_Annotated`: Annotated Job Description
  - `_Cover`: Cover letter

The relation between files can be understood from the file names or inferred from the `rel:` file property.

---
name: write-resume
description: Write resumes (tailored or generic), cover letters, and manage career data. Use when users share a LinkedIn job URL or job ID to fetch the posting and begin the resume workflow. Also use for critiquing existing resumes, harvesting achievement bullets into embeddings, recording feedback on bullet quality, or generating generic resumes without a specific job target.
metadata:
  version: 1.15.0
allowed-tools: Bash(jq:*) Bash(mustache:*) Bash(./scripts/render.sh:*) Bash(vale:*) mcp__linkedin-fetcher__fetch_job mcp__oh-my-cv-render__render_resume mcp__bullet-embeddings__harvest mcp__bullet-embeddings__query mcp__bullet-embeddings__feedback mcp__bullet-embeddings__embed_achievement mcp__bullet-embeddings__stats Read Write
---

# Resume Writer

Build on previous resumes and job descriptions in the working directory to understand the user's skillset and synthesize new resumes.

## Prerequisites

The working directory must contain `base.yaml` (job history, education, skill groups — the source of truth for hardcoded data) and `contact.yaml` (name, phone, email, links, location). Read these files to discover their structure — do not assume a schema.

For first-time setup or missing tools, see [/setup](references/setup.md).

## Preflight

Before doing anything else — before Eager Fetch, before reading reference files — verify the workspace:

1. Check that `base.yaml` exists in the working directory: `test -f base.yaml`
2. If **missing**, stop immediately. Tell the user:
   > ⚠️ `base.yaml` not found in the working directory.
   > This usually means the conversation isn't running inside a project, or the career data directory hasn't been assigned.
   > Please assign your project directory and start a new conversation.
3. Do **not** proceed with any workflow steps until this check passes.

## Eager Fetch

When the user provides a URL or job ID, act on it **immediately** — before reading any reference files, before listing directories, before anything else.

1. **Validate the link.** If the input is not a LinkedIn URL or numeric job ID, stop and tell the user: "This skill only supports LinkedIn job postings. Please provide a LinkedIn job URL or ID." Do not proceed with the rest of the workflow.
2. **Check for duplicates first.** Before making any network call, check whether this job already exists locally — search `job-descriptions/` and `resumes/` for the job ID. See the "Duplicate Check" section in [/fetch](references/fetch.md) for how. If found, skip fetching and continue from [/priority](references/priority.md).
3. **Fetch only if not duplicate.** Call `mcp__linkedin-fetcher__fetch_job` only after confirming no local duplicate exists. Do not read other reference files beforehand — the fetch is a network call and everything else can happen while you process the result.

## Workflow: Writing a Resume

### Tailored Resume

- [/fetch](references/fetch.md) (eager — should already be done per above)
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

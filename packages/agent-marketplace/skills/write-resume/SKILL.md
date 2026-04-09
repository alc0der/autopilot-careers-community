---
name: write-resume
description: Write resumes (tailored or generic), cover letters, and manage career data. Use when users share a LinkedIn job URL or job ID to fetch the posting and begin the resume workflow. Also use for critiquing existing resumes, harvesting achievement bullets into embeddings, recording feedback on bullet quality, or generating generic resumes without a specific job target.
metadata:
  version: 1.17.3
allowed-tools: Bash(vale:*) mcp__linkedin-fetcher__fetch_job mcp__oh-my-cv-render__render_resume mcp__oh-my-cv-render__merge_and_render mcp__bullet-embeddings__harvest mcp__bullet-embeddings__query mcp__bullet-embeddings__feedback mcp__bullet-embeddings__embed_achievement mcp__bullet-embeddings__stats Read Write
---

# Resume Writer

Build on previous resumes and job descriptions in the working directory to understand the user's skillset and synthesize new resumes.

## Prerequisites

The working directory must contain `base.yaml` (work history, education, skills — JSON Resume schema with `x-id` extensions) and `contact.yaml` (JSON Resume `basics` shape: name, label, email, phone, url, location, profiles, x-visa). Read these files to discover their structure — do not assume a schema.

For first-time setup or missing tools, see [/setup](references/setup.md).

## Preflight

Before doing anything else — before Eager Fetch, before reading reference files — verify the workspace:

1. Check that `base.yaml` exists in the working directory: `test -f base.yaml` — **record the result** but do not stop yet.
2. Check if `./techniques/` exists and contains at least one `.md` file: `ls techniques/*.md 2>/dev/null`
3. If techniques are **missing or empty**, run the onboarding flow: [/onboard](references/onboard.md). Onboarding may create `base.yaml` via [/ground](references/ground.md) if the user selects the `linkedin-grounding` technique.
4. After onboarding completes (or if techniques were already present), **re-check** that `base.yaml` exists.
5. If `base.yaml` is **still missing**, stop. Tell the user:
   > ⚠️ `base.yaml` not found in the working directory.
   > This usually means the conversation isn't running inside a project, or the career data directory hasn't been assigned.
   > Please assign your project directory and start a new conversation, or run `/ground` with a LinkedIn data export to generate it.
6. If both `base.yaml` and `./techniques/` are present, proceed normally — the workflow files will read techniques from `./techniques/` at the appropriate steps.
7. Preflight is complete. Proceed to Eager Fetch.

## Abort on Persistent Filesystem Errors

If any file read fails with `EDEADLK`, `Resource deadlock avoided`, or any repeated I/O error (same error on **2 consecutive attempts** to read the same file, or **3 total I/O errors** across different files):

1. **Stop all workflow steps immediately.**
2. Do **not** attempt workarounds — do not fall back to Obsidian, MCP tools, search tools, external APIs, or any other data source to retrieve the data that couldn't be read from the filesystem. Do **not** try alternative read methods (`cat`, `head`, `cp`, `rsync`, `dd`, `strings`, `mmap`, etc.) — if the Read tool failed, shell commands will fail for the same reason.
3. Report the failure to the user with the **specific diagnosis**:
   > ⛔ Aborting: persistent filesystem error (`<error message>`).
   >
   > **Most likely cause:** Your project directory is inside `~/Documents`, which is synced by iCloud Drive. When Claude's VM mounts iCloud-managed files, the macOS kernel detects a lock conflict between iCloud's daemon and the VM's FUSE layer, returning `EDEADLK` (Resource deadlock avoided). This is per-file and intermittent — some files may read fine while others fail.
   >
   > **To fix:**
   > 1. Open **System Settings → Apple Account → iCloud → iCloud Drive → Options** (or toggle "Desktop & Documents Folders" off).
   > 2. Alternatively, move your project folder outside of `~/Documents` (e.g., to `~/Projects`) so iCloud doesn't manage it.
   > 3. If you've already disabled iCloud sync, the files may still be "downloading" — open Finder, right-click the project folder, and choose **Download Now**, then restart this session.
   >
   > Restarting Claude, killing processes, or rebooting will **not** fix this — iCloud re-establishes its locks immediately.
4. Do **not** continue the resume workflow, even partially.

This rule is **non-negotiable** — creative workarounds to bypass filesystem errors risk accessing personal data from unintended sources.

## Data Source Boundaries

This skill reads career data **only** from files in the working directory (`base.yaml`, `contact.yaml`, `resumes/`, `job-descriptions/`, etc.) and from the allowed MCP tools listed in the frontmatter.

**Never** use Obsidian, Contacts, memory graphs, search tools, or any other external data source to obtain the user's personal information (name, phone, email, work history, etc.) — even if the working-directory files are temporarily unavailable. The `allowed-tools` list in the frontmatter is the exhaustive set of tools this skill may use.

## Eager Fetch

When the user provides a URL or job ID, act on it **immediately** — before reading any reference files, before listing directories, before anything else. Follow these steps **in order**:

1. **Validate the link.** If the input is not a LinkedIn URL or numeric job ID, stop and tell the user: "This skill only supports LinkedIn job postings. Please provide a LinkedIn job URL or ID." Do not proceed.
2. **Check locally first.** Extract the numeric job ID, then search `job-descriptions/` and `resumes/` for files matching that ID. Record whether a local JD and/or resume already exist.
3. **Fetch the latest JD.** Call `mcp__linkedin-fetcher__fetch_job`. Always fetch, even if a local copy exists — employers can update JDs.
4. **Handle result.** See [/fetch](references/fetch.md) for the full duplicate-check-and-diff flow:
   - **No local JD** → write the fetched content as a new file and proceed to [/priority](references/priority.md).
   - **Local JD exists** → diff the fetched content against the existing file. If unchanged, present the existing rendered resume and ask the user whether to regenerate. If changed, overwrite and proceed.

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

- [/onboard](references/onboard.md) — select and customize resume techniques (runs automatically on first use)
- [/ground](references/ground.md) — import or re-sync base.yaml from a LinkedIn data export
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

Job description files follow the pattern `YYYYMMDD_<company>_<job title>_<suffix>`, where:
- `YYYYMMDD`: Date the JD was fetched (e.g., 20260405)
- `<company>`: Name of the company
- `<job title>`: Job title (underscores replace spaces)
- `<suffix>`: One of:
  - `JD_Raw`: Job Description (as-is from source)
  - `JD`: Job Description after normalizing
  - `JD_Annotated`: Annotated Job Description
  - `_Cover`: Cover letter

**Examples:**
- `20260405_Google_Senior_Software_Engineer_JD_Raw.md`
- `20260331_Edison_Smart_Senior_Java_Backend_Engineer_JD_Annotated.md`

The relation between files can be understood from the file names or inferred from the `rel:` file property.

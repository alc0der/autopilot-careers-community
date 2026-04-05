### Execute

This skill uses a **base + contact + patch YAML** workflow:

```d2
direction: down

base: Base YAML {
  label: "Base YAML\n(hardcoded)"
}

contact: Contact YAML {
  label: "Contact YAML\n(user info)"
}

ai: AI YAML {
  label: "AI YAML\n(generated)"
}

merge: Merge {
  label: "Merge\n(deep merge)"
}

template: Template {
  label: "Template\n(mustache)"
}

pdf: PDF {
  label: "PDF\n(renderer)"
}

base -> merge
contact -> merge
ai -> merge
merge -> template
template -> pdf
```

#### Reference Files

- **./base.yaml** (in working directory root): Hardcoded job structure (titles, companies, dates) - the "source of truth"
- **./contact.yaml** (in working directory root): Personal contact information (name, phone, email, etc.)
- **template.md**: Mustache template for final resume rendering
- **`<skill-base-dir>/scripts/render.sh`**: Shell script to merge and render

#### Steps

1. Read `base.yaml` to get the job structure with ids
2. **Do not modify job titles** - they must stay consistent with LinkedIn. If a title change seems beneficial for the target role, ask the user for approval first.
3. Generate achievements and skills that best demonstrate qualifications for the target role:
   - Highlight skills and achievements that directly relate to the job requirements
   - **The resume must fit on one page.** Optimize for this from the start using graduated bullet counts (see below), but do not aggressively cut content on the first pass.
   - Use action verbs (i.e led) and quantify achievements where possible
   - Refer to technologies by name when possible (i.e built using Spring)
   - Never over explain points relevance to Job Description (i.e demonstrating ability to leverage cutting-edge technologies for business growth)
   - **Graduated bullet counts by job recency** (most recent job listed first):
     - Job 1 (most recent): 4-5 bullets
     - Job 2: 3-4 bullets
     - Job 3: 2-3 bullets
     - Job 4+: 1-2 bullets
     - Oldest 1-2 jobs: may be omitted entirely if space is tight
4. Write AI YAML to `resumes/YYYYMMDD_<Target>_<Role>_ai.yaml` with:
   - `tagline` — pick the best fit for the target role:
     - `"EM | Founding Eng."` — for people-focused roles (Engineering Manager, etc.)
     - `"Sr. Eng. Manager"` — for technical leadership roles (Tech Lead, Staff Engineer, etc.)
   - Jobs matched by `id` field from base.yaml
   - `achievements` array for each job (graduated counts per step 3)
   - `skill_groups` with populated skills strings
   - Decorate skills with logos: `<span class="iconify" data-icon="vscode-icons:file-type-{{technology}}"></span>`
   - Don't overuse logos. Keep it between 2-5 logos
5. Run the render script to merge and generate the final resume (output to `rendered/`).
   Pass `$TMP_DIR` from plugin config as an environment variable:
   ```sh
   TMP_DIR=<resolved_tmp_dir> <skill-base-dir>/scripts/render.sh resumes/<ai.yaml> rendered/<output>.md
   ```
6. Render the markdown to PDF using the `mcp__oh-my-cv-render__render_resume` MCP tool. It converts the markdown to a styled, print-ready PDF, waiting for Iconify icons to load so skill logos render correctly.
   Call with `input` set to the **absolute path** of `rendered/<output>.md`.
   The tool returns JSON: `{ "pdf": "<path>", "pageCount": <n> }`.
   Pass `html: true` to also save the intermediate HTML for debugging.
   Pass `metadata` to stamp PDF-level metadata for traceability:
   ```yaml
   metadata:
     title: "{name} — {target company} {role}"      # from contact.yaml + JD
     author: "{name}"                                 # from contact.yaml
     subject: "Tailored for: {target} — {role}"       # from JD
     keywords: ["{target company}", "{role}"]          # from JD
   ```
7. **Page-fit verification loop.** Check the `pageCount` from the render tool's JSON response:
   - If `pageCount` is **1** → done, proceed to step 8.
   - If `pageCount` is **2+** → trim content and re-render. Apply these reductions in order, one at a time, re-rendering after each until it fits:
     1. Remove all bullets from the oldest job (or omit it entirely)
     2. Remove all bullets from the second-oldest job (or omit it)
     3. Remove 1 bullet from each remaining job, starting from the oldest
     4. Shorten the skills list (remove least-relevant skills)
   - Re-run steps 5-6 after each trim, then re-check page count.
   - **Max 4 iterations** to avoid infinite loops. If still 2+ pages after 4 rounds, present the result and ask the user for guidance.
8. If you are Claude, present the resume in an artifact
9. **Harvest bullets into embeddings** (skip if `bullet-embeddings` MCP not available)
   Call `mcp__bullet-embeddings__harvest` with `file` set to the **absolute path** of the AI YAML file.
   This indexes all generated bullets for future reuse intelligence. No user interaction needed.
10. **Finalize** — Once the user approves or deems the resume good enough:
    - Copy the final PDF to the working directory root with the user's name from `contact.yaml`: `./<Name>_Resume.pdf` (e.g., `./Ahmad_Akilan_Resume.pdf`)
    - Present the path to the user
11. **Next steps** — After presenting the resume, suggest these follow-up actions:
    - **Apply** — provide the original LinkedIn job URL from the JD front matter (`rel:source`) so the user can go apply directly
    - **Cover letter** — offer to run `/cover` to generate a tailored cover letter while the JD context is fresh
    - **Feedback** — offer to run `/feedback` to capture corrections, clarifications, and per-bullet signals as ground truth for future resumes

#### AI YAML Output Format

```yaml
tagline: "Sr. Eng. Manager"

jobs:
  - id: beno_cto
    achievements:
      - Achievement 1...
      - Achievement 2...

  - id: beno_em
    achievements:
      - Achievement 1...

  # ... other jobs matched by id

skill_groups:
  - category: Technical
    skills: Skill1, <span class="iconify" data-icon="vscode-icons:file-type-aws"></span> AWS, ...
  - category: Managerial
    skills: Strategy, Leadership, ...
```

#### Template Variables Reference

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `tagline` | string | AI | One of: `"EM \| Founding Eng."` or `"Sr. Eng. Manager"` |
| `name` | string | Contact | Full name |
| `phone` | string | Contact | Phone number (display format) |
| `phone_link` | string | Derived | Phone number stripped to +digits only |
| `email` | string | Contact | Email address |
| `github` | string | Contact | GitHub username |
| `linkedin` | string | Contact | LinkedIn username |
| `website` | string | Contact | Personal website URL |
| `location` | string | Contact | City, Country |
| `visa` | string | Contact | Work authorization (optional) |
| `jobs[].id` | string | Base | Unique identifier for merge matching |
| `jobs[].title` | string | Base | Job title (do not modify without user approval) |
| `jobs[].company` | string | Base | Company name |
| `jobs[].city` | string | Base | Location |
| `jobs[].start_date` | string | Base | Start date |
| `jobs[].end_date` | string | Base | End date or "Present" |
| `jobs[].achievements` | array | AI | Bullet point achievements |
| `education[].institution` | string | Base | University/school name |
| `education[].city` | string | Base | Location |
| `education[].degree` | string | Base | Degree title |
| `education[].start_date` | string | Base | Start year |
| `education[].end_date` | string | Base | End year |
| `skill_groups[].category` | string | Base | Category name |
| `skill_groups[].skills` | string | AI | Comma-separated skills with icons |

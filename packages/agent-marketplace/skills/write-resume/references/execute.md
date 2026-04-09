### Execute

This skill uses a **base + contact + overlay YAML** workflow following the [JSON Resume](https://jsonresume.org) standard:

```d2
direction: down

base: Base YAML {
  label: "Base YAML\n(work, education, skills)"
}

contact: Contact YAML {
  label: "Contact YAML\n(basics)"
}

ai: AI Overlay YAML {
  label: "AI Overlay\n(highlights, keywords)"
}

merge: Merge & Render {
  label: "merge_and_render\n(TypeScript)"
}

pdf: PDF {
  label: "PDF\n(Puppeteer)"
}

base -> merge
contact -> merge
ai -> merge
merge -> pdf
```

#### Reference Files

- **./base.yaml** (in working directory root): Hardcoded job structure using JSON Resume schema (`work[]` with `x-id`, `position`, `name`, `location`, `startDate`, `endDate`; `education[]`; `skills[]`)
- **./contact.yaml** (in working directory root): Personal contact information using JSON Resume `basics` shape (`name`, `label`, `email`, `phone`, `url`, `location`, `profiles[]`, `x-visa`)

#### Steps

1. Read `base.yaml` to get the job structure with `x-id` values. Read `./techniques/linkedin-grounding.md` if it exists and follow its strictness rules: in strict mode, titles and dates must match base.yaml exactly; in moderate mode, title adjustments require user approval; in loose mode, adjustments are free. If absent, treat base.yaml as manually maintained with no strictness enforcement.
2. **Job titles** — Read `./techniques/job-title-lock.md` if it exists and follow its instructions regarding job title modifications. If absent (and linkedin-grounding is also absent), use titles from `base.yaml` as-is.
3. Generate highlights and skills that best demonstrate qualifications for the target role:
   - Highlight skills and achievements that directly relate to the job requirements
   - Read `./techniques/page-layout.md` if it exists and follow its rules for page constraints and bullet counts. If absent, use your best judgment for content length and bullet distribution.
   - Use action verbs (i.e led) and quantify achievements where possible
   - Refer to technologies by name when possible (i.e built using Spring)
   - Never over explain points relevance to Job Description (i.e demonstrating ability to leverage cutting-edge technologies for business growth)
4. Write AI overlay YAML to `resumes/YYYYMMDD_<Target>_<Role>_ai.yaml` with:
   - `basics.label` — Read `./techniques/dual-tagline.md` if it exists and pick a tagline per its rules. If absent, choose an appropriate tagline for the target role.
   - `work[]` entries matched by `x-id` field from base.yaml
   - `highlights` array for each work entry (graduated counts per step 3)
   - `skills[]` with populated `keywords` arrays
   - Decorate skills with icon shortcodes: `:icon-set--icon-name:` (e.g., `:vscode-icons--file-type-aws: AWS`)
   - Read `./techniques/skill-logo-limit.md` if it exists and follow its logo count rules. If absent, use a reasonable number of logos (avoid overuse).
5. Merge and render using the `mcp__oh-my-cv-render__merge_and_render` MCP tool.
   Call with:
   - `base`: absolute path to `./base.yaml`
   - `contact`: absolute path to `./contact.yaml`
   - `ai`: absolute path to `resumes/<ai.yaml>`
   - `output`: absolute path to `rendered/<output>.pdf`
   - `html: true` to save intermediate HTML for debugging
   - `metadata` to stamp PDF-level metadata:
   ```yaml
   metadata:
     title: "{name} — {target company} {role}"      # from contact.yaml + JD
     author: "{name}"                                 # from contact.yaml
     subject: "Tailored for: {target} — {role}"       # from JD
     keywords: ["{target company}", "{role}"]          # from JD
   ```
   The tool returns JSON: `{ "pdf": "<path>", "pageCount": <n>, "markdown": "<path>", "json": "<path>" }`.
   It automatically merges the three YAMLs, validates against JSON Resume schema, generates markdown, and renders to PDF.
6. **Page-fit verification.** Read `./techniques/page-layout.md` if it exists — follow its page-fit verification loop instructions (page limit, trim cascade, max iterations). Re-run step 5 after each trim. If no page-layout technique exists, check whether the resume exceeds 2 pages and flag it to the user for guidance.
7. If you are Claude, present the resume in an artifact
8. **Harvest bullets into embeddings**
   Call `mcp__bullet-embeddings__harvest` with `file` set to the **absolute path** of the AI YAML file.
   This indexes all generated bullets for future reuse intelligence. No user interaction needed.
   - If the user already opted out of embeddings during the Plan phase query step, skip this step silently.
   - If `harvest` returns an error containing "Ollama is not reachable" or the tool call fails (MCP not connected), report the error to the user and move on — do not block the rest of the workflow.
9. **Finalize** — Once the user approves or deems the resume good enough:
    - Copy the final PDF to the working directory root with the user's name from `contact.yaml`: `./<Name>_Resume.pdf` (e.g., `./Ahmad_Akilan_Resume.pdf`)
    - Present the path to the user
10. **Next steps** — After presenting the resume, suggest these follow-up actions:
    - **Apply** — provide the original LinkedIn job URL from the JD front matter (`rel:source`) so the user can go apply directly
    - **Cover letter** — offer to run `/cover` to generate a tailored cover letter while the JD context is fresh
    - **Feedback** — offer to run `/feedback` to capture corrections, clarifications, and per-bullet signals as ground truth for future resumes
11. **Technique update check** — Compare the user's `./techniques/` against the technique library at `<skill-base-dir>/techniques-library/`:
    - **New techniques**: If library techniques are not present in `./techniques/` and were not available when the user last ran `/onboard`, tip:
      > New technique available: **{name}** — {summary}. Run `/onboard` to add it, or create `./techniques/{name}.md` manually.
    - **Updated techniques**: Compare the `version` field in library frontmatter against when the user last onboarded. If a library technique has a higher version, tip:
      > **{name}** has been updated (v{old} → v{new}). Run `/onboard` to review changes.
    - **Deprecated techniques**: If the user has a technique with `deprecated: true` in the library and a `recommended-replacement` exists, tip:
      > **{name}** is deprecated — consider switching to **{replacement}**. Run `/onboard` to reconfigure.
    If all library techniques are accounted for and up to date, say nothing.

#### AI Overlay YAML Output Format (JSON Resume)

```yaml
basics:
  label: "Sr. Eng. Manager"

work:
  - x-id: beno_cto
    highlights:
      - Achievement 1...
      - Achievement 2...

  - x-id: beno_lead
    highlights:
      - Achievement 1...

  # ... other work entries matched by x-id

skills:
  - name: Technical
    keywords:
      - ":vscode-icons--file-type-aws: AWS"
      - ":devicon--java: Java"
      - Kubernetes
  - name: Managerial
    keywords:
      - Strategy
      - Leadership
```

#### Icon Shortcode Reference

Format: `:icon-set--icon-name:` (double-dash maps to Iconify's `set:name` separator)

Examples:
- `:devicon--java:` → Java icon
- `:vscode-icons--file-type-aws:` → AWS icon
- `:simple-icons--openai:` → OpenAI icon
- `:tabler--phone:` → Phone icon

Place the shortcode before the skill name: `:vscode-icons--file-type-aws: AWS (EKS, Lambda)`

#### JSON Resume Field Reference

| Field | Type | Source | JSON Resume Path |
|-------|------|--------|------------------|
| `basics.label` | string | AI | Per `./techniques/dual-tagline.md` or user's choice |
| `basics.name` | string | Contact | Full name |
| `basics.phone` | string | Contact | Phone number (display format) |
| `basics.email` | string | Contact | Email address |
| `basics.url` | string | Contact | Personal website URL |
| `basics.location` | object | Contact | `{city, region}` |
| `basics.profiles[]` | array | Contact | `{network, username, url}` |
| `basics.x-visa` | string | Contact | Work authorization (optional) |
| `work[].x-id` | string | Base | Unique identifier for merge matching |
| `work[].position` | string | Base | Job title (do not modify without user approval) |
| `work[].name` | string | Base | Company name |
| `work[].location` | string | Base | Location |
| `work[].startDate` | string | Base | ISO 8601 partial date (YYYY-MM or YYYY) |
| `work[].endDate` | string | Base | ISO 8601 partial date (omit for "Present") |
| `work[].highlights` | array | AI | Bullet point achievements |
| `education[].institution` | string | Base | University/school name |
| `education[].x-location` | string | Base | Location |
| `education[].studyType` | string | Base | Degree type (e.g. "Master of Science") |
| `education[].area` | string | Base | Field of study |
| `education[].startDate` | string | Base | Start year |
| `education[].endDate` | string | Base | End year |
| `skills[].name` | string | Base | Category name (e.g. "Technical") |
| `skills[].keywords` | array | AI | Skills with optional icon shortcodes |

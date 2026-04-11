## oh-my-cv-render MCP Interface

The **oh-my-cv-render** container exposes two MCP tools over stdio. The write-resume skill calls them during the render phase of the resume workflow.

![](embed:Containers)

### Tools

| Tool | Purpose |
|------|---------|
| `merge_and_render` | End-to-end: merge YAML files, validate, convert to markdown, render PDF |
| `render_resume` | Render a pre-converted oh-my-cv markdown file to PDF |

---

### merge_and_render

The primary tool. The skill generates an AI overlay YAML, then delegates the merge + render pipeline to this tool.

#### Request

```json
{
  "base": "/Users/alc0der/Documents/Projects/Career on Autopilot/base.yaml",
  "contact": "/Users/alc0der/Documents/Projects/Career on Autopilot/contact.yaml",
  "ai": "/Users/alc0der/Documents/Projects/Career on Autopilot/resumes/20260410_Energetech_Technology_AI_Lead_ai.yaml",
  "output": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.pdf",
  "html": true,
  "metadata": {
    "title": "Ahmad Akilan - Energetech Technology & AI Lead",
    "author": "Ahmad Akilan",
    "subject": "Tailored for: Energetech - Technology & AI Lead",
    "keywords": ["Energetech", "Technology & AI Lead"]
  }
}
```

All paths are absolute. The three YAML files follow the JSON Resume schema:

- **base.yaml** -- work history, education, skills (static across applications)
- **contact.yaml** -- name, email, phone, profiles (static)
- **ai.yaml** -- per-application overlay: tailored highlights, skill keywords, professional label

#### Response (success)

```json
{
  "pdf": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.pdf",
  "pageCount": 1,
  "markdown": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.md",
  "json": "/Users/alc0der/Documents/Projects/Career on Autopilot/rendered/20260410_Energetech_Technology_AI_Lead_Resume.json"
}
```

Side-effects: writes `.pdf`, `.md`, `.json`, and (when `html: true`) `.html` files next to the output path.

#### Response (validation error)

When the merged JSON Resume fails schema validation, the tool returns `isError: true`:

```text
Validation errors:
basics.email: Invalid email format
work[0].startDate: Expected ISO 8601 date (YYYY, YYYY-MM, or YYYY-MM-DD)
```

---

### render_resume

Lower-level tool for re-rendering an already-converted markdown file (e.g., after manual edits).

#### Request

```json
{
  "input": "/path/to/resume.md",
  "output": "/path/to/resume.pdf",
  "html": true,
  "metadata": {
    "title": "Ahmad Akilan - Staff SWE",
    "author": "Ahmad Akilan"
  }
}
```

Only `input` is required. `output` defaults to the input path with a `.pdf` extension. `css` is auto-detected by walking up from the input directory looking for `style.css`.

#### Response (success)

```json
{
  "pdf": "/path/to/resume.pdf",
  "pageCount": 1
}
```

---

### Where this fits in the workflow

The dynamic view below shows the full cold-start scenario. The renderer is called after the skill writes the AI overlay YAML:

![](embed:ColdStart)

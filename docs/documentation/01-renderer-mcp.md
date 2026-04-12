## oh-my-cv-render MCP Interface

The **oh-my-cv-render** container exposes one MCP tool over stdio. The write-resume skill calls it during the render phase of the resume workflow.

![](embed:Containers)

### Tools

| Tool | Purpose |
|------|---------|
| `render_resume` | Render an oh-my-cv markdown resume to PDF |

---

### render_resume

Accepts two modes: **local** (file paths) and **remote** (inline content). The mode is detected automatically from the `input` parameter — absolute paths (starting with `/`) trigger local mode, anything else is treated as inline markdown content.

#### Local Mode

The skill writes the rendered markdown to disk, then passes the file path. The tool reads from disk, renders to PDF, writes the output, and returns the path.

##### Request

```json
{
  "input": "/path/to/resume.md",
  "output": "/path/to/resume.pdf",
  "metadata": {
    "title": "Ahmad Akilan — Staff SWE",
    "author": "Ahmad Akilan",
    "subject": "Tailored for: Kraken — Staff Software Engineer",
    "keywords": ["Kraken", "Staff Software Engineer"]
  }
}
```

Only `input` is required. `output` defaults to the input path with a `.pdf` extension. `css` is auto-detected by walking up from the input directory looking for `style.css`, or can be passed as an absolute path.

##### Response (success)

```json
{
  "pdf": "/path/to/resume.pdf",
  "pageCount": 1
}
```

#### Remote Mode

The skill passes markdown content inline. The tool renders it and returns the PDF as a base64-encoded embedded resource.

##### Request

```json
{
  "input": "---\nname: Ahmad Akilan <br><small>Staff SWE</small>\nheader:\n  - text: ...\n---\n\n## Work Experience...",
  "filename": "20260410_Energetech_Resume",
  "metadata": {
    "title": "Ahmad Akilan — Energetech Technology & AI Lead",
    "author": "Ahmad Akilan"
  }
}
```

`filename` provides the output stem (no path, no extension). `css` can be passed as inline CSS content; if omitted, the server uses its bundled default stylesheet.

##### Response (success)

```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "render://20260410_Energetech_Resume.pdf",
        "mimeType": "application/pdf",
        "blob": "<base64-encoded PDF bytes>"
      }
    }
  ]
}
```

The client is responsible for decoding and writing the PDF to the user's directory.

#### Response (error)

Both modes return `isError: true` with a text content block:

```text
Error rendering resume: <error message>
```

---

### Where this fits in the workflow

The dynamic view below shows the full cold-start scenario. The renderer is called after the skill generates the oh-my-cv markdown:

![](embed:ColdStart)

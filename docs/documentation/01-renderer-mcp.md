## oh-my-cv-render MCP Interface

The **oh-my-cv-render** container exposes one MCP tool over stdio. The write-resume skill calls it during the render phase of the resume workflow.

![](embed:Containers)

### Tools

| Tool | Purpose |
|------|---------|
| `render_resume` | Render an oh-my-cv markdown resume to PDF |

---

### render_resume

Accepts inline markdown content and returns the rendered PDF as a base64-encoded `EmbeddedResource` alongside the page count. The renderer never touches the filesystem — the skill reads the markdown source, sends content, and writes the decoded PDF.

#### Request

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | string | yes | Full markdown content of the rendered resume. |
| `filename` | string | no | Stem used in the response URI label (e.g. `render://20260410_Energetech_Resume.pdf`). Defaults to `"resume"`. The server does **not** use this as a filesystem path. |
| `css` | string | no | Inline CSS overrides. If omitted, the server uses its bundled default stylesheet. |
| `metadata` | object | no | `title`, `author`, `subject`, `keywords` — stamped into the PDF document properties. |

#### Response (success)

Two content blocks: a `resource` carrying the PDF bytes, and a `text` block carrying the page count.

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
    },
    {
      "type": "text",
      "text": "{\"pageCount\":1}"
    }
  ]
}
```

The `uri` is a label, not a fetchable path. The client decodes `blob` and writes the PDF wherever it chose. The `pageCount` text block supports the skill's page-fit verification loop.

#### Response (error)

`isError: true` with a text content block:

```text
Error rendering resume: <error message>
```

---

### Where this fits in the workflow

The dynamic view below shows the full cold-start scenario. The renderer is called after the skill generates the oh-my-cv markdown:

![](embed:ColdStart)

# 3. Evaluate OSS JSON Resume renderer as the rendering core

Date: 2026-04-12

## Status

Rejected

## Context

The **@autopilot/renderer** package renders resumes through a multi-stage pipeline:

```
JSON Resume (3 YAMLs merged) → Markdown (toMarkdown.ts) → HTML (markdown-it) → PDF (Puppeteer)
```

The JSON Resume standard ([jsonresume.org](https://jsonresume.org/)) has an established OSS ecosystem of renderers and themes. We evaluated whether adopting an OSS JSON Resume renderer — specifically **`resumed`** — as the rendering core could replace the custom Markdown-to-HTML stage and simplify the pipeline to:

```
JSON Resume → HTML (theme) → PDF (Puppeteer)
```

### JSON Resume ecosystem survey

**The standard.** JSON Resume defines a 12-section JSON schema (v1.0.0, JSON Schema Draft-07) for resume data: `basics`, `work`, `education`, `skills`, `projects`, `certificates`, etc. The schema is extensible (`additionalProperties: true`) and published as `@jsonresume/schema` (2.4k stars, MIT).

**`resumed`** ([github.com/rbardini/resumed](https://github.com/rbardini/resumed)) is the modern, recommended renderer. It is the strongest candidate for programmatic use.

| Attribute | Detail |
|-----------|--------|
| Stars | ~515 |
| License | MIT |
| Language | TypeScript, pure ESM |
| Size | ~180 LOC, 3 production deps |
| Latest release | v6.1.0 (Sep 2025) |
| Node.js | ^20.12 or >=21.7 |
| API | `render()`, `validate()`, `pdf()` — all usable as library functions |

Pipeline: `resumed` delegates rendering entirely to a theme — `render(resume, theme)` calls `theme.render(resume)` which returns an HTML string. PDF export uses Puppeteer via the optional `pdf()` function.

**Other renderers evaluated:**

| Tool | Stars | Status | Verdict |
|------|-------|--------|---------|
| `resume-cli` | 4.7k | Last release Oct 2022; docs recommend `resumed` | Legacy, CLI-only |
| HackMyResume | 9.3k | Last active ~2017 | Abandoned |
| KissMyResume | 68 | Last commit Jan 2023 | Stale, CLI-only |
| Reactive Resume | 36.2k | Active (full-stack SaaS) | Wrong form factor — not embeddable |

**Theme ecosystem.** 400+ npm packages matching `jsonresume-theme-*`. A theme is an npm package exporting `render(resume) → string`. All CSS and assets must be inlined in the HTML output. Themes produce HTML only — PDF always requires a separate Puppeteer step. Theme quality varies widely; many are unmaintained.

### What our current pipeline provides

The custom renderer has capabilities that no existing JSON Resume theme provides:

1. **Embedded Minion Pro fonts** — four OTF variants base64-encoded at build time via esbuild loaders.
2. **Iconify icon shortcodes** — `:set--icon-name:` notation in highlight bullets and headers, rendered via the Iconify CDN script with a 15-second load timeout before PDF capture.
3. **Definition lists** — `markdown-it-deflist` plugin for structured sub-headings (the `:~` syntax for position/location/date lines).
4. **Dynamic style system** — runtime-configurable margins, line height, paragraph spacing, theme color, font size, and paper size via `ResumeStyles`.
5. **Layered CSS pipeline** — eight ordered layers: Tailwind reset → reset overrides → font-face → template → user CSS → post-user overrides → dynamic CSS → print CSS.
6. **Custom `x-` extensions** — `x-visa`, `x-id`, `x-yearsExperience`, `x-location`, `x-phoneLink` are woven into the rendering logic.

### Options considered

**A. Adopt `resumed` + existing theme (e.g., `jsonresume-theme-even`)**

Use `resumed` as the rendering core with an off-the-shelf theme. Drop custom Markdown pipeline entirely.

- Eliminates the intermediate Markdown step.
- Content/presentation cleanly separated.
- But: no existing theme supports Iconify icons, Minion Pro embedding, definition list layout, dynamic style parameters, or our `x-` extensions. Output would look generic.

**B. Adopt `resumed` + custom theme**

Write a `jsonresume-theme-autopilot` package implementing the current layout as a JSON Resume theme, then use `resumed` to orchestrate rendering.

- Preserves visual fidelity.
- Gets schema validation and the `resumed` API for free.
- But: the theme would need to replicate everything `markdownToHtml.ts` + `htmlDocument.ts` + `cssBuilder.ts` currently do — font embedding, icon expansion, definition list HTML generation, layered CSS, dynamic styles. The theme contract (`render(resume) → string`) is simple, but writing this theme is equivalent effort to what already exists.
- `resumed` itself adds ~180 LOC of wrapper around `theme.render()` + Puppeteer. We already call Puppeteer directly.

**C. Keep current pipeline, no change**

The existing architecture already uses JSON Resume as its data model (the `merge` command and `converter/` module). The Markdown intermediate form is deliberate — it is human-readable, debuggable, and used in the skill's page-fit verification loop. The rendering pipeline (`markdownToHtml` → `cssBuilder` → `pdfGenerator`) is where the custom value lives.

### Analysis

| Criterion | Option A (existing theme) | Option B (custom theme) | Option C (no change) |
|-----------|--------------------------|------------------------|---------------------|
| Visual fidelity | Low — generic output | High — matches current | High — is current |
| Migration effort | Low | High (rewrite as theme) | None |
| Ongoing maintenance | Theme updates may break | Must maintain theme + `resumed` dep | Maintain current code |
| Intermediate Markdown | Lost | Lost | Preserved |
| Icon support | None | Must reimplement | Native |
| Font embedding | Theme-dependent | Must reimplement | Native |
| Dynamic styles | Theme-dependent | Must reimplement | Native |
| `resumed` value-add | Schema validation, theme swap | Schema validation | Already have Zod validation |
| Pipeline complexity | JSON → HTML → PDF | JSON → HTML → PDF | JSON → MD → HTML → PDF |
| MCP interface impact | Must change to accept JSON Resume | Must change to accept JSON Resume | None (ADR 0002 intact) |

The core issue: `resumed` is a thin orchestrator (~180 LOC). Its value proposition is the theme ecosystem, but no existing theme meets our requirements. Writing a custom theme that does is equivalent to wrapping our existing rendering code in a `render(resume) → string` interface — we gain the interface but not any reduction in code or complexity. Meanwhile, we lose the intermediate Markdown form and must change the MCP server interface (contradicting ADR 0002's decision that the renderer is a pure Markdown-to-PDF typesetter).

## Decision

**Keep the current Markdown-based rendering pipeline.** Do not adopt `resumed` or restructure around JSON Resume themes.

The architecture already uses JSON Resume where it adds value — as the **data model** for the merge/overlay system (`converter/`). The rendering pipeline is where the project's custom typography, icon system, and dynamic styling live, and there is no off-the-shelf JSON Resume theme that provides equivalent output. Writing a custom theme would be a lateral move: same code, different interface, no net benefit.

## Consequences

- **The intermediate Markdown form is preserved.** It remains human-readable, useful for debugging, and compatible with the page-fit verification loop in the skill.
- **ADR 0002 remains valid.** The MCP server continues to accept Markdown input, not JSON Resume.
- **No new dependency on `resumed`.** The converter module's Zod-based validation serves the same purpose as `resumed`'s `validate()`.
- **Theme experimentation is still possible.** If we later want to support multiple visual styles, we can add theme selection within the existing CSS pipeline (swap the template CSS) without adopting the JSON Resume theme contract.
- **JSON Resume portability is unaffected.** The `merge` command already produces valid JSON Resume documents. Export to other tools or the JSON Resume registry is possible via the converter module without changing the renderer.

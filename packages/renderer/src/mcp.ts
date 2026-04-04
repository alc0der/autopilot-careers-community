console.log = (...args: unknown[]) => console.error(...args);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import fs from "node:fs";
import path from "node:path";
import { renderMarkdownToPdf } from "./renderer/index";

/**
 * Walk up from `startDir` looking for `style.css`.
 * Returns the first match, or undefined if none found.
 */
function findStyleCss(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "style.css");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const server = new McpServer({
  name: "oh-my-cv-render",
  version: "2.2.0",
});

server.tool(
  "render_resume",
  "Render an oh-my-cv markdown resume to PDF. Returns the output PDF path and page count.",
  {
    input: z.string().describe("Absolute path to the rendered Markdown file"),
    output: z.optional(z.string().describe("Output PDF path (defaults to input with .pdf extension)")),
    css: z.optional(z.string().describe("Path to style.css (auto-detected from input directory if omitted)")),
    html: z.optional(z.boolean().describe("Also save intermediate HTML file")),
    metadata: z.optional(z.object({
      title: z.optional(z.string().describe("PDF title (e.g. 'Ahmad Akilan — Kraken Staff SWE')")),
      author: z.optional(z.string().describe("PDF author (e.g. candidate name)")),
      subject: z.optional(z.string().describe("PDF subject (e.g. 'Tailored for: Kraken — Staff Software Engineer')")),
      keywords: z.optional(z.array(z.string()).describe("PDF keywords (e.g. ['resume', 'Kraken'])")),
    }).describe("PDF metadata fields stamped into the document")),
  },
  async ({ input, output, css, html, metadata }) => {
    const inputPath = path.resolve(input);
    const outputPath = output
      ? path.resolve(output)
      : inputPath.replace(/\.md$/i, ".pdf");
    const cssPath = css ? path.resolve(css) : findStyleCss(path.dirname(inputPath));

    try {
      const result = await renderMarkdownToPdf(inputPath, outputPath, { html, css: cssPath, metadata });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ pdf: outputPath, pageCount: result.pageCount }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error rendering resume: ${message}` }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

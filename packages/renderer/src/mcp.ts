console.log = (...args: unknown[]) => console.error(...args);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod/v4";
import fs from "node:fs";
import path from "node:path";
import { renderMarkdownToPdf, renderMarkdownContent } from "./renderer/index";

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

function createServer(): McpServer {
  const server = new McpServer({
    name: "oh-my-cv-render",
    version: "3.0.0",
  });

  server.tool(
    "render_resume",
    "Render an oh-my-cv markdown resume to PDF. Accepts either an absolute file path (local mode) or inline markdown content (remote mode). In local mode, writes the PDF to disk and returns its path. In remote mode, returns the PDF as a base64-encoded embedded resource.",
    {
      input: z.string().describe("Markdown content or absolute path to a .md file (starts with '/' = file path, otherwise inline content)"),
      output: z.optional(z.string().describe("Output PDF path (local mode only, defaults to input path with .pdf extension)")),
      filename: z.optional(z.string().describe("Output filename stem for remote mode (e.g. '20260410_Energetech_Resume')")),
      css: z.optional(z.string().describe("CSS content or absolute path to style.css (starts with '/' = file path, otherwise inline CSS)")),
      html: z.optional(z.boolean().describe("Also save intermediate HTML file (local mode only)")),
      metadata: z.optional(z.object({
        title: z.optional(z.string().describe("PDF title (e.g. 'Ahmad Akilan — Kraken Staff SWE')")),
        author: z.optional(z.string().describe("PDF author (e.g. candidate name)")),
        subject: z.optional(z.string().describe("PDF subject (e.g. 'Tailored for: Kraken — Staff Software Engineer')")),
        keywords: z.optional(z.array(z.string()).describe("PDF keywords (e.g. ['resume', 'Kraken'])")),
      }).describe("PDF metadata fields stamped into the document")),
    },
    async ({ input, output, filename, css, html, metadata }) => {
      const isLocal = input.startsWith("/");

      if (isLocal) {
        const inputPath = path.resolve(input);
        const outputPath = output
          ? path.resolve(output)
          : inputPath.replace(/\.md$/i, ".pdf");
        const cssResolved = css?.startsWith("/") ? path.resolve(css) : css;
        const cssPath = cssResolved ?? findStyleCss(path.dirname(inputPath));

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
      }

      try {
        const result = await renderMarkdownContent(input, { css, metadata });
        const stem = filename ?? "resume";
        return {
          content: [{
            type: "resource" as const,
            resource: {
              uri: `render://${stem}.pdf`,
              mimeType: "application/pdf",
              blob: Buffer.from(result.pdfBytes).toString("base64"),
            },
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

  return server;
}

async function main() {
  if (process.env.MCP_TRANSPORT === "http") {
    const port = parseInt(process.env.MCP_PORT ?? "3002", 10);
    const app = createMcpExpressApp({ host: "0.0.0.0" });

    app.post("/mcp", async (req, res) => {
      const server = createServer();
      try {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => { transport.close(); server.close(); });
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
        }
      }
    });

    app.get("/mcp", (_req, res) => {
      res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
    });

    app.delete("/mcp", (_req, res) => {
      res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
    });

    app.listen(port, () => console.error(`oh-my-cv-render MCP HTTP on :${port}`));
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch(console.error);

console.log = (...args: unknown[]) => console.error(...args);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod/v4";
import { renderMarkdownContent } from "./renderer/index";

function createServer(): McpServer {
  const server = new McpServer({
    name: "oh-my-cv-render",
    version: "4.0.1",
  });

  server.tool(
    "render_resume",
    "Render an oh-my-cv markdown resume to PDF. Accepts inline markdown content and returns the PDF as a base64-encoded embedded resource alongside the page count.",
    {
      input: z.string().describe("Markdown content"),
      filename: z.optional(z.string().describe("Output filename stem for the response URI label (e.g. '20260410_Energetech_Resume'). Defaults to 'resume'.")),
      css: z.optional(z.string().describe("Inline CSS overrides. If omitted, the server's bundled default stylesheet is used.")),
      metadata: z.optional(z.object({
        title: z.optional(z.string().describe("PDF title (e.g. 'Ahmad Akilan — Kraken Staff SWE')")),
        author: z.optional(z.string().describe("PDF author (e.g. candidate name)")),
        subject: z.optional(z.string().describe("PDF subject (e.g. 'Tailored for: Kraken — Staff Software Engineer')")),
        keywords: z.optional(z.array(z.string()).describe("PDF keywords (e.g. ['resume', 'Kraken'])")),
      }).describe("PDF metadata fields stamped into the document")),
    },
    async ({ input, filename, css, metadata }) => {
      try {
        const result = await renderMarkdownContent(input, { css, metadata });
        const stem = filename ?? "resume";
        return {
          content: [
            {
              type: "resource" as const,
              resource: {
                uri: `render://${stem}.pdf`,
                mimeType: "application/pdf",
                blob: Buffer.from(result.pdfBytes).toString("base64"),
              },
            },
            {
              type: "text" as const,
              text: JSON.stringify({ pageCount: result.pageCount }),
            },
          ],
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod/v4";
import { fetchJobAsMarkdown, RateLimitError } from "./core";
import { createPuppeteerFetcher } from "./fetchers/puppeteer";

console.log = (...args: unknown[]) => console.error(...args);
console.info = (...args: unknown[]) => console.error(...args);
console.warn = (...args: unknown[]) => console.error(...args);

function createServer(): McpServer {
  const server = new McpServer({
    name: "linkedin-fetcher",
    version: "1.0.0",
  });

  server.tool(
    "fetch_job",
    "Fetch a LinkedIn job posting and return it as markdown. Provide either a LinkedIn job URL or a numeric job ID.",
    {
      url: z.optional(z.string().describe("LinkedIn job URL (e.g. https://www.linkedin.com/jobs/view/1234567890)")),
      id: z.optional(z.string().describe("LinkedIn job ID (numeric, e.g. 1234567890)")),
    },
    async ({ url, id }) => {
      if (!url && !id) {
        return {
          content: [{ type: "text" as const, text: "Error: Either url or id must be provided" }],
          isError: true,
        };
      }

      try {
        const markdown = await fetchJobAsMarkdown({ url, id }, createPuppeteerFetcher());
        return {
          content: [{ type: "text" as const, text: markdown }],
        };
      } catch (error) {
        if (error instanceof RateLimitError) {
          const input = url || id;
          return {
            content: [{
              type: "text" as const,
              text: [
                `RATE_LIMITED: LinkedIn is throttling requests from this IP.`,
                `The job posting (${input}) could not be fetched right now.`,
                ``,
                `Suggested action: Wait ${error.retryAfterSeconds} seconds, then call this tool again with the same arguments.`,
                `Do NOT fall back to a different method — the rate limit is temporary.`,
              ].join("\n"),
            }],
            isError: true,
          };
        }
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching job: ${message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

async function main() {
  if (process.env.MCP_TRANSPORT === "http") {
    const port = parseInt(process.env.MCP_PORT ?? "3001", 10);
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

    app.listen(port, () => console.error(`linkedin-fetcher MCP HTTP on :${port}`));
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch(console.error);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { fetchJobAsMarkdown, RateLimitError } from "./core";

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
      const markdown = await fetchJobAsMarkdown({ url, id });
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerHarvestTool } from "./tools/harvest.js";
import { registerEmbedAchievementTool } from "./tools/embed-achievement.js";
import { registerQueryTool } from "./tools/query.js";
import { registerFeedbackTool } from "./tools/feedback.js";
import { registerStatsTool } from "./tools/stats.js";
import { initIndexes } from "./lib/vectra.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "bullet-embeddings",
    version: "0.1.0",
  });
  registerHarvestTool(server);
  registerEmbedAchievementTool(server);
  registerQueryTool(server);
  registerFeedbackTool(server);
  registerStatsTool(server);
  return server;
}

async function checkOllama() {
  const url = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(
      `WARNING: Ollama is not reachable at ${url}.\n` +
        "Embedding tools will fail until Ollama is running."
    );
  }
}

async function main() {
  await checkOllama();
  await initIndexes();

  if (process.env.MCP_TRANSPORT === "http") {
    const port = parseInt(process.env.MCP_PORT ?? "3003", 10);
    const app = express();
    app.use(express.json());

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

    app.listen(port, () => console.error(`bullet-embeddings MCP HTTP on :${port}`));
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error("Failed to start bullet-embeddings MCP server:", err);
  process.exit(1);
});

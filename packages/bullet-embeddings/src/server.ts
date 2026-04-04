import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerHarvestTool } from "./tools/harvest.js";
import { registerEmbedAchievementTool } from "./tools/embed-achievement.js";
import { registerQueryTool } from "./tools/query.js";
import { registerFeedbackTool } from "./tools/feedback.js";
import { registerStatsTool } from "./tools/stats.js";
import { initIndexes } from "./lib/vectra.js";

const server = new McpServer({
  name: "bullet-embeddings",
  version: "0.1.0",
});

registerHarvestTool(server);
registerEmbedAchievementTool(server);
registerQueryTool(server);
registerFeedbackTool(server);
registerStatsTool(server);

async function checkOllama() {
  try {
    const res = await fetch("http://localhost:11434");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(
      "WARNING: Ollama is not reachable at http://localhost:11434.\n" +
        "Embedding tools will fail until Ollama is running."
    );
  }
}

async function main() {
  await checkOllama();
  await initIndexes();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start bullet-embeddings MCP server:", err);
  process.exit(1);
});

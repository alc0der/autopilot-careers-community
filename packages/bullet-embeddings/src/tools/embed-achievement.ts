import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHash } from "crypto";
import { getEmbedding, ollamaErrorResponse } from "../lib/embeddings.js";
import { getAchievementsIndex } from "../lib/vectra.js";

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function registerEmbedAchievementTool(server: McpServer, userId: string): void {
  server.tool(
    "embed_achievement",
    "Embed a single achievement into the achievements index",
    {
      text: z.string().describe("Achievement text"),
      jobId: z.string().describe("Job ID from base.yaml"),
      date: z.string().describe("ISO date (YYYY-MM-DD)"),
      reviewed: z.boolean().optional().default(false).describe("Whether human-reviewed"),
      hasEvidence: z.boolean().optional().default(false).describe("Whether evidence URL exists"),
    },
    async ({ text, jobId, date, reviewed, hasEvidence }) => {
      const hash = textHash(text);
      const id = `ach_${jobId}_${date}_${hash.slice(0, 8)}`;

      let embedding: number[];
      try {
        embedding = await getEmbedding(text);
      } catch (err) {
        const errResponse = ollamaErrorResponse(err);
        if (errResponse) return errResponse;
        throw err;
      }
      const index = await getAchievementsIndex(userId);

      // Remove existing if same id
      const existing = await index.listItemsByMetadata({ id: { $eq: id } });
      if (existing.length > 0) {
        await index.deleteItem(existing[0].id);
      }

      await index.insertItem({
        vector: embedding,
        metadata: {
          id,
          job_id: jobId,
          date,
          reviewed,
          has_evidence: hasEvidence,
          text_hash: hash,
          text,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id, status: "embedded", jobId, date }),
          },
        ],
      };
    }
  );
}

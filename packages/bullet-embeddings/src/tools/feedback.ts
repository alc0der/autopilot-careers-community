import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getEmbedding, ollamaErrorResponse } from "../lib/embeddings.js";
import { getBulletsIndex } from "../lib/vectra.js";
import type { IndexItem, MetadataTypes } from "vectra";

export function registerFeedbackTool(server: McpServer, userId: string): void {
  server.tool(
    "feedback",
    "Record human signal on a bullet point",
    {
      search: z.string().optional().describe("Text fragment to find the bullet"),
      id: z.string().optional().describe("Direct bullet ID"),
      signal: z
        .enum(["great", "exaggerated", "needs_evidence", "weak"])
        .describe("Feedback signal"),
    },
    async ({ search, id, signal }) => {
      if (!search && !id) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Provide either search or id parameter" }),
            },
          ],
        };
      }

      const index = await getBulletsIndex(userId);
      let targetItem: IndexItem<Record<string, MetadataTypes>> | undefined;

      if (id) {
        const items = await index.listItemsByMetadata({ id: { $eq: id } });
        if (items.length === 0) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: `Bullet ${id} not found` }) },
            ],
          };
        }
        targetItem = items[0];
      } else {
        let embedding: number[];
        try {
          embedding = await getEmbedding(search!);
        } catch (err) {
          const errResponse = ollamaErrorResponse(err);
          if (errResponse) return errResponse;
          throw err;
        }
        const results = await index.queryItems(embedding, "", 1);
        if (results.length === 0) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: "No matching bullet found" }) },
            ],
          };
        }
        targetItem = results[0].item;
      }

      const targetText = (targetItem.metadata.text as string) ?? "";
      const metaId = targetItem.metadata.id as string;

      // Delete and re-insert with updated feedback
      const itemData = await index.getItem(targetItem.id);
      if (!itemData) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "Could not read item data" }) },
          ],
        };
      }

      await index.deleteItem(targetItem.id);
      await index.insertItem({
        vector: itemData.vector,
        metadata: { ...targetItem.metadata, feedback: signal },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: metaId,
              text: targetText,
              signal,
              status: "feedback recorded",
            }),
          },
        ],
      };
    }
  );
}

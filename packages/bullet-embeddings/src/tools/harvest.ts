import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import { createHash } from "crypto";
import { basename } from "path";
import { getEmbeddings, getEmbedding, ollamaErrorResponse } from "../lib/embeddings.js";
import { getBulletsIndex, getAchievementsIndex } from "../lib/vectra.js";

interface AiYaml {
  tagline?: string;
  jobs?: Array<{
    id: string;
    achievements?: string[];
  }>;
  skill_groups?: Array<{
    category: string;
    skills: string;
  }>;
}

function parseResumeStem(filename: string): {
  date: string;
  company: string;
  role: string;
} {
  const stem = filename.replace(/_ai\.yaml$/, "");
  const parts = stem.split("_");
  const dateStr = parts[0];
  const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  const rest = parts.slice(1);
  const company = rest.slice(0, Math.ceil(rest.length / 2)).join(" ");
  const role = rest.slice(Math.ceil(rest.length / 2)).join(" ");
  return { date, company, role };
}

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function registerHarvestTool(server: McpServer): void {
  server.tool(
    "harvest",
    "Embed bullets from an AI YAML resume file into Vectra for trust analysis",
    { file: z.string().describe("Path to AI YAML file") },
    async ({ file }) => {
      const content = await readFile(file, "utf-8");
      const data = parse(content) as AiYaml;

      if (!data.jobs || data.jobs.length === 0) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ harvested: 0, new: 0, updated: 0 }) },
          ],
        };
      }

      const filename = basename(file);
      const resumeStem = filename.replace(/_ai\.yaml$/, "");
      const { date, company, role } = parseResumeStem(filename);

      const bulletsIdx = await getBulletsIndex();
      const achievementsIdx = await getAchievementsIndex();

      // Collect all bullet texts
      const allTexts: string[] = [];
      const allMeta: Array<{ jobId: string; index: number }> = [];

      for (const job of data.jobs) {
        if (!job.achievements) continue;
        for (let i = 0; i < job.achievements.length; i++) {
          allTexts.push(job.achievements[i]);
          allMeta.push({ jobId: job.id, index: i });
        }
      }

      if (allTexts.length === 0) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ harvested: 0, new: 0, updated: 0 }) },
          ],
        };
      }

      let embeddings: number[][];
      try {
        embeddings = await getEmbeddings(allTexts);
      } catch (err) {
        const errResponse = ollamaErrorResponse(err);
        if (errResponse) return errResponse;
        throw err;
      }

      let newCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < allTexts.length; i++) {
        const text = allTexts[i];
        const { jobId, index } = allMeta[i];
        const id = `bul_${resumeStem}_${jobId}_${index}`;
        const hash = textHash(text);

        // Find nearest achievement
        let nearestAchId = "";
        let achDistance = -1;

        const achItems = await achievementsIdx.listItems();
        if (achItems.length > 0) {
          const achResults = await achievementsIdx.queryItems(embeddings[i], "", 1);
          if (achResults.length > 0) {
            nearestAchId = (achResults[0].item.metadata.id as string) ?? "";
            achDistance = 1 - achResults[0].score; // Convert similarity to distance
          }
        }

        const metadata = {
          id,
          job_id: jobId,
          resume_file: filename,
          resume_date: date,
          target_company: company,
          target_role: role,
          text_hash: hash,
          text,
          feedback: "",
          nearest_achievement_id: nearestAchId,
          achievement_distance: achDistance,
        };

        // Check if exists by querying for exact id
        const existing = await bulletsIdx.listItemsByMetadata({ id: { $eq: id } });
        if (existing.length > 0) {
          await bulletsIdx.deleteItem(existing[0].id);
          updatedCount++;
        } else {
          newCount++;
        }

        await bulletsIdx.insertItem({
          vector: embeddings[i],
          metadata,
        });
      }

      const result = {
        harvested: allTexts.length,
        new: newCount,
        updated: updatedCount,
        file: filename,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

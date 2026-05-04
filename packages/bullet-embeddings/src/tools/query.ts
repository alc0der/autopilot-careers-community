import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getEmbedding, ollamaErrorResponse } from "../lib/embeddings.js";
import {
  getAchievementsIndex,
  getBulletsIndex,
} from "../lib/vectra.js";
import {
  GROUNDEDNESS_THRESHOLD,
  CLUSTER_THRESHOLD,
  type QueryResult,
} from "../lib/types.js";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface ClusterInfo {
  centroid: number[];
  members: Array<{
    text: string;
    job_id: string;
    resume_file: string;
    resume_date: string;
    feedback: string;
    achievement_distance: number;
    vector: number[];
  }>;
}

const FEEDBACK_PRIORITY: Record<string, number> = {
  great: 4,
  needs_evidence: 3,
  weak: 2,
  exaggerated: 1,
  "": 0,
};

function buildClusters(
  items: Array<{
    text: string;
    job_id: string;
    resume_file: string;
    resume_date: string;
    feedback: string;
    achievement_distance: number;
    vector: number[];
  }>
): ClusterInfo[] {
  const clusters: ClusterInfo[] = [];

  for (const item of items) {
    let assigned = false;
    for (const cluster of clusters) {
      const sim = cosineSimilarity(item.vector, cluster.centroid);
      if (sim >= CLUSTER_THRESHOLD) {
        cluster.members.push(item);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({
        centroid: item.vector,
        members: [item],
      });
    }
  }

  return clusters;
}

function aggregateCluster(cluster: ClusterInfo): {
  reuse_count: number;
  last_used: string;
  feedback: string | null;
  representative_text: string;
  representative_job_id: string;
  achievement_distance: number;
} {
  const resumeFiles = new Set(cluster.members.map((m) => m.resume_file));
  const reuse_count = resumeFiles.size;

  let last_used = "";
  let bestFeedback = "";
  let bestFeedbackPriority = -1;
  let bestAchDist = -1;
  let representativeText = "";
  let representativeJobId = "";
  let latestDate = "";

  for (const m of cluster.members) {
    if (m.resume_date > last_used) last_used = m.resume_date;

    const priority = FEEDBACK_PRIORITY[m.feedback] ?? 0;
    if (priority > bestFeedbackPriority) {
      bestFeedbackPriority = priority;
      bestFeedback = m.feedback;
    }

    // Use the best (lowest) achievement distance
    if (m.achievement_distance !== -1) {
      if (bestAchDist === -1 || m.achievement_distance < bestAchDist) {
        bestAchDist = m.achievement_distance;
      }
    }

    // Representative = most recent version
    if (m.resume_date > latestDate) {
      latestDate = m.resume_date;
      representativeText = m.text;
      representativeJobId = m.job_id;
    }
  }

  return {
    reuse_count,
    last_used,
    feedback: bestFeedback || null,
    representative_text: representativeText,
    representative_job_id: representativeJobId,
    achievement_distance: bestAchDist,
  };
}

export function registerQueryTool(server: McpServer): void {
  server.tool(
    "query",
    "Find similar bullets for a JD or text query, with trust signals",
    {
      jd_text: z.string().optional().describe("Annotated JD content (full text)"),
      text: z.string().optional().describe("Free text query"),
      top: z.coerce.number().optional().default(20).describe("Number of results"),
      jobId: z.string().optional().describe("Filter by job_id"),
    },
    async ({ jd_text, text, top, jobId }) => {
      if (!jd_text && !text) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Provide either jd_text or text parameter" }),
            },
          ],
        };
      }

      const queryText: string = jd_text ?? text!;

      let queryEmbedding: number[];
      try {
        queryEmbedding = await getEmbedding(queryText);
      } catch (err) {
        const errResponse = ollamaErrorResponse(err);
        if (errResponse) return errResponse;
        throw err;
      }

      const bulletsIdx = await getBulletsIndex();
      const achievementsIdx = await getAchievementsIndex();

      const results: QueryResult[] = [];

      // Query achievements
      const achItems = await achievementsIdx.listItems();
      if (achItems.length > 0) {
        const achResults = await achievementsIdx.queryItems(queryEmbedding, "", Math.min(top, 10));
        for (const r of achResults) {
          const meta = r.item.metadata;
          if (jobId && meta.job_id !== jobId) continue;

          results.push({
            text: (meta.text as string) ?? "",
            source: "achievement",
            job_id: (meta.job_id as string) ?? "",
            similarity: r.score,
            achievement_distance: 0,
            grounded: true,
            reuse_count: 0,
            last_used: null,
            feedback: null,
          });
        }
      }

      // Query bullets with cluster-based dedup
      const bulletItems = await bulletsIdx.listItems();
      if (bulletItems.length > 0) {
        // Load all items with vectors for clustering
        const allWithVectors: Array<{
          text: string;
          job_id: string;
          resume_file: string;
          resume_date: string;
          feedback: string;
          achievement_distance: number;
          vector: number[];
        }> = [];

        for (const item of bulletItems) {
          const full = await bulletsIdx.getItem(item.id);
          if (!full) continue;
          if (jobId && (item.metadata.job_id as string) !== jobId) continue;

          allWithVectors.push({
            text: (item.metadata.text as string) ?? "",
            job_id: (item.metadata.job_id as string) ?? "",
            resume_file: (item.metadata.resume_file as string) ?? "",
            resume_date: (item.metadata.resume_date as string) ?? "",
            feedback: (item.metadata.feedback as string) ?? "",
            achievement_distance: (item.metadata.achievement_distance as number) ?? -1,
            vector: full.vector,
          });
        }

        // Build clusters
        const clusters = buildClusters(allWithVectors);

        // Map each cluster centroid to its aggregated info
        const clusterMap = new Map<number, ReturnType<typeof aggregateCluster>>();
        for (let i = 0; i < clusters.length; i++) {
          clusterMap.set(i, aggregateCluster(clusters[i]));
        }

        // Query Vectra for top results
        const bulletResults = await bulletsIdx.queryItems(queryEmbedding, "", top * 3);

        // Map results to clusters and deduplicate
        const seenClusters = new Set<number>();

        for (const r of bulletResults) {
          const meta = r.item.metadata;
          if (jobId && meta.job_id !== jobId) continue;

          // Find which cluster this result belongs to
          const resultVector = (await bulletsIdx.getItem(r.item.id))?.vector;
          if (!resultVector) continue;

          let clusterIdx = -1;
          let bestSim = -1;
          for (let i = 0; i < clusters.length; i++) {
            const sim = cosineSimilarity(resultVector, clusters[i].centroid);
            if (sim > bestSim) {
              bestSim = sim;
              clusterIdx = i;
            }
          }

          if (clusterIdx === -1 || seenClusters.has(clusterIdx)) continue;
          seenClusters.add(clusterIdx);

          const agg = clusterMap.get(clusterIdx)!;

          results.push({
            text: agg.representative_text,
            source: "ai_generated",
            job_id: agg.representative_job_id,
            similarity: r.score,
            achievement_distance: agg.achievement_distance === -1 ? null : agg.achievement_distance,
            grounded:
              agg.achievement_distance !== -1 &&
              agg.achievement_distance < GROUNDEDNESS_THRESHOLD,
            reuse_count: agg.reuse_count,
            last_used: agg.last_used,
            feedback: agg.feedback,
          });

          if (seenClusters.size >= top) break;
        }
      }

      // Sort by similarity descending
      results.sort((a, b) => b.similarity - a.similarity);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results.slice(0, top), null, 2) }],
      };
    }
  );
}

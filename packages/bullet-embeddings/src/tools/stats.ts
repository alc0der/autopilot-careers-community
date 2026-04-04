import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAchievementsIndex, getBulletsIndex } from "../lib/vectra.js";

export function registerStatsTool(server: McpServer): void {
  server.tool(
    "stats",
    "Get collection sizes, feedback distribution, and top reused bullets",
    {},
    async () => {
      const achievementsIdx = await getAchievementsIndex();
      const bulletsIdx = await getBulletsIndex();

      const achievementItems = await achievementsIdx.listItems();
      const bulletItems = await bulletsIdx.listItems();

      const feedbackDist: Record<string, number> = {
        great: 0,
        exaggerated: 0,
        needs_evidence: 0,
        weak: 0,
        none: 0,
      };

      const textHashCounts = new Map<
        string,
        { count: number; text: string; jobId: string }
      >();

      for (const item of bulletItems) {
        const feedback = (item.metadata.feedback as string) || "";
        const hash = item.metadata.text_hash as string;
        const text = (item.metadata.text as string) ?? "";
        const jobId = (item.metadata.job_id as string) ?? "";

        if (feedback && feedback in feedbackDist) {
          feedbackDist[feedback]++;
        } else {
          feedbackDist.none++;
        }

        const existing = textHashCounts.get(hash);
        if (!existing) {
          textHashCounts.set(hash, { count: 1, text, jobId });
        } else {
          existing.count++;
        }
      }

      const topReused = [...textHashCounts.values()]
        .filter((v) => v.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((v) => ({
          text: v.text.slice(0, 80) + (v.text.length > 80 ? "..." : ""),
          job_id: v.jobId,
          reuse_count: v.count,
        }));

      const result = {
        achievements: achievementItems.length,
        bullets: bulletItems.length,
        feedback_distribution: feedbackDist,
        top_reused: topReused,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

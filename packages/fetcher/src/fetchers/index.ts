import { fetchJobWithApi, RateLimitError } from "./api";
import { fetchJobWithPuppeteer } from "./puppeteer";
import { parseArticle } from "../html-processor";

export { RateLimitError } from "./api";

export const fetchJob = async (urlOrId: string, usePuppeteer = false) => {
  // Use Puppeteer for non-LinkedIn URLs or when requested
  const isLinkedIn = urlOrId.includes("linkedin.com") || /^\d+$/.test(urlOrId);

  if (usePuppeteer || !isLinkedIn) {
    const url = /^\d+$/.test(urlOrId)
      ? `https://www.linkedin.com/jobs/view/${urlOrId}`
      : urlOrId;
    const html = await fetchJobWithPuppeteer(url);
    return { html, title: "Job Posting" };
  }

  // Use API for LinkedIn
  try {
    const jobData = await fetchJobWithApi(urlOrId);
    const html = `
      <html>
        <body>
          <article>
            <div class="show-more-less-html__markup">
              ${jobData.html}
            </div>
          </article>
        </body>
      </html>
    `;
    return { html, title: `${jobData.title} | ${jobData.company}`, jobData };
  } catch (error) {
    // Let rate limit errors propagate so the MCP layer can inform the agent
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Fallback to Puppeteer for other API failures
    console.log(`API failed (${error instanceof Error ? error.message : error}), falling back to Puppeteer`);
    const url = /^\d+$/.test(urlOrId)
      ? `https://www.linkedin.com/jobs/view/${urlOrId}`
      : urlOrId;
    const html = await fetchJobWithPuppeteer(url);
    return { html, title: "Job Posting" };
  }
};

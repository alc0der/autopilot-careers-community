import { fetchJobWithApi, RateLimitError } from "./api";

export { RateLimitError } from "./api";

export type HtmlFetcher = (url: string) => Promise<string>;

export const fetchJob = async (urlOrId: string, htmlFetcher?: HtmlFetcher) => {
  const isLinkedIn = urlOrId.includes("linkedin.com") || /^\d+$/.test(urlOrId);

  if (!isLinkedIn) {
    if (!htmlFetcher) {
      throw new Error(`No htmlFetcher provided for non-LinkedIn URL: ${urlOrId}`);
    }
    const html = await htmlFetcher(urlOrId);
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
    if (error instanceof RateLimitError) {
      throw error;
    }
    if (!htmlFetcher) {
      throw error;
    }
    console.log(`API failed (${error instanceof Error ? error.message : error}), falling back to htmlFetcher`);
    const url = /^\d+$/.test(urlOrId)
      ? `https://www.linkedin.com/jobs/view/${urlOrId}`
      : urlOrId;
    const html = await htmlFetcher(url);
    return { html, title: "Job Posting" };
  }
};

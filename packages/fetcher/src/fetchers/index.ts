import { fetchJobWithApi } from "./api";
import { fetchJobWithPuppeteer } from "./puppeteer";
import { parseArticle } from "../html-processor";

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
    // Fallback to Puppeteer if API fails
    console.log("API failed, using Puppeteer");
    const url = /^\d+$/.test(urlOrId)
      ? `https://www.linkedin.com/jobs/view/${urlOrId}`
      : urlOrId;
    const html = await fetchJobWithPuppeteer(url);
    return { html, title: "Job Posting" };
  }
};

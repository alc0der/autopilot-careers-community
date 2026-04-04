import { fetchJobWithApi } from "../src/fetchers/api";
import { htmlToMarkdown } from "../src/htmlToMarkdown";

describe("LinkedIn API Pipeline", () => {
  const testJobId = "4277851038";

  test("fetchJobWithApi extracts job data", async () => {
    const jobData = await fetchJobWithApi(testJobId);

    // Normalize dynamic content for stable snapshots
    const stableJobData = {
      ...jobData,
      url: "[NORMALIZED_URL]",
      html: jobData.html
        .replace(/data-tracking-id="[^"]+"/g, 'data-tracking-id="[DYNAMIC]"')
        .replace(/data-reference-id="[^"]+"/g, 'data-reference-id="[DYNAMIC]"'),
    };

    expect(stableJobData).toMatchSnapshot();
  }, 15000);

  test("htmlToMarkdown converts job HTML", async () => {
    const jobData = await fetchJobWithApi(testJobId);

    const fullHtml = `
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

    const markdown = htmlToMarkdown({
      content: fullHtml,
      title: jobData.title,
      byline: "",
      dir: "",
      excerpt: "",
      lang: "",
      length: 0,
      siteName: "LinkedIn",
      textContent: "",
    });

    expect(markdown).toMatchSnapshot();
  }, 10000);

  test("end-to-end pipeline", async () => {
    const jobData = await fetchJobWithApi(testJobId);

    const fullHtml = `
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

    const markdown = htmlToMarkdown({
      content: fullHtml,
      title: jobData.title,
      byline: "",
      dir: "",
      excerpt: "",
      lang: "",
      length: 0,
      siteName: "LinkedIn",
      textContent: "",
    });

    const pipeline = {
      input: testJobId,
      jobData: {
        ...jobData,
        url: "[NORMALIZED_URL]",
        html: "[HTML_CONTENT]",
        description: "[DESCRIPTION_CONTENT]",
      },
      markdown: markdown,
    };

    expect(pipeline).toMatchSnapshot();
  }, 15000);
});

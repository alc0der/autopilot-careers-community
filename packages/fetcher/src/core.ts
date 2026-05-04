import { extractArticle, htmlToMarkdown } from "./htmlToMarkdown";
import { extractReadModeHTML } from "./markdownProcessor";
import { normalizeMarkdown } from "./normalizeMarkdown";
import { classifyJobPosting } from "./classifyJobPosting";
import { fetchJob, RateLimitError, type HtmlFetcher } from "./fetchers";
export { RateLimitError } from "./fetchers";
export type { HtmlFetcher } from "./fetchers";
import { fileLogger as fileLoggerFn, logger } from "./loggers";

function resolveUrl(input: { url?: string; id?: string }): { url: URL; id: string } {
  if (input.url) {
    const url = new URL(input.url);
    const id = input.id ?? input.url.split("/").pop() ?? "";
    return { url, id };
  }
  if (input.id) {
    return {
      url: new URL(`https://www.linkedin.com/jobs/view/${input.id}`),
      id: input.id,
    };
  }
  throw new Error("Either url or id must be provided");
}

export async function fetchJobAsMarkdown(
  input: { url?: string; id?: string },
  htmlFetcher?: HtmlFetcher,
): Promise<string> {
  const { url, id } = resolveUrl(input);
  const urlString = url.toString();
  const fileLogger = fileLoggerFn(id);

  const { html: htmlContent, title, jobData } = await fetchJob(urlString, htmlFetcher);
  logger.info(`Job fetched: ${title}`);
  fileLogger.info(htmlContent);

  const processedHtml = extractReadModeHTML(htmlContent);
  fileLogger.info(processedHtml);

  const article = extractArticle(processedHtml);
  fileLogger.info(article.content);

  const finalContent = htmlToMarkdown(article);
  fileLogger.info(finalContent);

  const formattedMarkdown = normalizeMarkdown(finalContent);
  fileLogger.info(formattedMarkdown);

  const postingType = classifyJobPosting(title, formattedMarkdown);
  const yamlMeta = `---\nrel:source: ${urlString}\ntype: ${postingType}\ntags:\n- jd\n---\n\n`;

  let fullMarkdown = yamlMeta;

  if (jobData) {
    fullMarkdown += `# ${jobData.title}\n\n**Company:** ${jobData.company}\n**Location:** ${jobData.location}\n\n`;
    if (jobData.criteria && jobData.criteria.length > 0) {
      fullMarkdown += "## Job Details\n\n";
      jobData.criteria.forEach((item) => {
        fullMarkdown += `- **${item.label}:** ${item.value}\n`;
      });
      fullMarkdown += "\n";
    }
  }

  fullMarkdown += formattedMarkdown;
  return fullMarkdown;
}

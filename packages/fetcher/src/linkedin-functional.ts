import { extractArticle, htmlToMarkdown } from "./htmlToMarkdown";
import * as cheerio from "cheerio";
import { Result, ResultAsync, ok, err } from "neverthrow";

// Type definitions
type JobId = string;
type JobUrl = URL | string;
type JobInput = JobId | JobUrl;
type PartialHtml = string;
type FullHtml = string;
type Markdown = string;

// Error types
class FetchError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

// Function implementations with neverthrow
const isRateLimited = (html: string): boolean =>
  html.includes("Job search smarter with Premium") ||
  html.includes("Retry Premium for");

export const fetchHtml = (id: JobId): ResultAsync<PartialHtml, FetchError> => {
  return ResultAsync.fromPromise(
    fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`),
    (error) => new FetchError(0, `Network error: ${error}`),
  ).andThen((response) =>
    response.ok
      ? ResultAsync.fromPromise(
          response.text(),
          (error) =>
            new FetchError(
              response.status,
              `Failed to read response: ${error}`,
            ),
        ).andThen((html) =>
          isRateLimited(html)
            ? err(new FetchError(429, "LinkedIn rate limit hit (Premium upsell returned instead of job data)"))
            : ok(html),
        )
      : ResultAsync.fromSafePromise(
          Promise.resolve(
            err(
              new FetchError(
                response.status,
                `Failed to fetch job: ${response.status}`,
              ),
            ),
          ),
        ).andThen((r) => r),
  );
};

export const correctHtml = (
  partialHtml: PartialHtml,
): Result<FullHtml, ParseError> => {
  return ok(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>LinkedIn Job</title>
      </head>
      <body>
        <article>
          ${partialHtml}
        </article>
      </body>
    </html>
  `);
};

export const convertHtmlToMarkdown = (
  fullHtml: FullHtml,
): Result<Markdown, ParseError> => {
  try {
    const $ = cheerio.load(fullHtml);
    const title =
      $(".top-card-layout__title").text().trim() ||
      $(".topcard__title").text().trim() ||
      $("h1").first().text().trim() ||
      "LinkedIn Job";

    const article = extractArticle(fullHtml);
    return ok(
      htmlToMarkdown({
        ...article,
        title,
        byline: "",
        siteName: "LinkedIn",
      }),
    );
  } catch (error) {
    return err(new ParseError(`Failed to convert HTML to Markdown: ${error}`));
  }
};

// Extract job ID from various input types
export const extractJobId = (input: JobInput): Result<JobId, ParseError> => {
  // If it's already a URL object
  if (input instanceof URL) {
    const match = input.pathname.match(/\/jobs\/view\/(\d+)/);
    return match
      ? ok(match[1])
      : err(new ParseError(`Could not extract job ID from URL: ${input.href}`));
  }

  // Handle string input
  const stringInput = String(input);

  // Check if it's already a job ID
  if (/^\d+$/.test(stringInput)) {
    return ok(stringInput);
  }

  // Try to parse as URL
  try {
    const url = new URL(stringInput);
    const urlMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
    return urlMatch
      ? ok(urlMatch[1])
      : err(new ParseError(`Valid URL but no job ID found: ${stringInput}`));
  } catch (error) {
    // Not a valid URL, continue to legacy matching
  }

  // Legacy regex matching for partial URLs or paths
  const pathMatch = stringInput.match(/\/jobs\/view\/(\d+)/);
  return pathMatch
    ? ok(pathMatch[1])
    : err(new ParseError(`Could not extract job ID from: ${stringInput}`));
};

// Composed pipeline using neverthrow
export const fetchLinkedInJob = (
  jobId: JobId,
): ResultAsync<Markdown, FetchError | ParseError> => {
  return fetchHtml(jobId)
    .andThen((html) => correctHtml(html))
    .andThen((html) => convertHtmlToMarkdown(html));
};

// Main entry point with error handling
export const getLinkedInJobMarkdown = (
  input: JobInput,
): ResultAsync<Markdown, ParseError | FetchError> => {
  const jobIdResult = extractJobId(input);
  if (jobIdResult.isErr()) {
    return new ResultAsync(Promise.resolve(err(jobIdResult.error)));
  }
  return fetchLinkedInJob(jobIdResult.value);
};

// Curried version for partial application
export const createJobFetcher =
  (fetchFn = fetchHtml) =>
  (correctFn = correctHtml) =>
  (convertFn = convertHtmlToMarkdown) =>
  (jobId: JobId): ResultAsync<Markdown, FetchError | ParseError> => {
    return fetchFn(jobId)
      .andThen((html) => correctFn(html))
      .andThen((html) => convertFn(html));
  };

// Helper for converting to Promise (for backward compatibility)
export const processLinkedInJob = async (
  input: JobInput,
): Promise<Markdown> => {
  const result = await getLinkedInJobMarkdown(input);
  return result.match(
    (markdown) => markdown,
    (error) => {
      throw error;
    },
  );
};

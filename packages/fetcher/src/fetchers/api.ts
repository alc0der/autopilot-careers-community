import * as cheerio from "cheerio";

export type JobData = {
  title: string;
  company: string;
  location: string;
  description: string;
  html: string;
  criteria: Array<{ label: string; value: string }>;
  url: string;
};

const extractJobId = (urlOrId: string): string => {
  if (/^\d+$/.test(urlOrId)) {
    return urlOrId;
  }
  const match = urlOrId.match(/\/jobs\/view\/(\d+)/);
  if (match) {
    return match[1];
  }
  throw new Error(`Could not extract job ID from: ${urlOrId}`);
};

const extractJobDataFromHtml = (html: string, url: string): JobData => {
  const $ = cheerio.load(html);

  // Extract job title
  const title =
    $(".top-card-layout__title").text().trim() ||
    $(".topcard__title").text().trim() ||
    $("h1").first().text().trim() ||
    "Unknown Title";

  // Extract company name
  const company =
    $(".topcard__org-name-link").text().trim() ||
    $('a[data-tracking-control-name="public_jobs_topcard-org-name"]')
      .text()
      .trim() ||
    $(".top-card-layout__entity-info h4 a").text().trim() ||
    "Unknown Company";

  // Extract location
  const location =
    $(".topcard__flavor--bullet").first().text().trim() ||
    $(".top-card-layout__entity-info .topcard__flavor").text().trim() ||
    "Unknown Location";

  // Extract job description HTML
  const descriptionHtml =
    $(".show-more-less-html__markup").html() ||
    $(".description__text").html() ||
    $(".decorated-job-posting__details .description").html() ||
    "";

  // Extract job criteria (seniority level, employment type, etc.)
  const criteria = $(".description__job-criteria-item")
    .map((_, el) => ({
      label: $(el).find(".description__job-criteria-subheader").text().trim(),
      value: $(el).find(".description__job-criteria-text").text().trim(),
    }))
    .get()
    .filter((item) => item.label && item.value);

  // Clean up the description text (remove HTML tags for plain text version)
  const description = $("<div>").html(descriptionHtml).text().trim();

  return {
    title,
    company,
    location,
    description,
    html: descriptionHtml,
    criteria,
    url,
  };
};

export const fetchJobWithApi = async (urlOrId: string) => {
  const jobId = extractJobId(urlOrId);
  const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch job: ${response.status}`);
  }

  const html = await response.text();
  return extractJobDataFromHtml(html, apiUrl);
};

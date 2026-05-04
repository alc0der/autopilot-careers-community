import path from "node:path";

export function isLinkedInUrl(url: URL): boolean {
  return url.hostname.includes("linkedin.com");
}

export function renameLinkedInJob(title: string, jdsDir: string): string {
  const [jobTitle, company] = title.split(" | ");
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return path.join(jdsDir, `${datePrefix}_${company}_${jobTitle.replace("/", "|")}.md`);
}

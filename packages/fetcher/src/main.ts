import { program } from "commander";
import fs from "node:fs";
import path from "node:path";
import packageJson from "../package.json";
import { processOptions } from "./app_cli";
import { isLinkedInUrl, renameLinkedInJob } from "./linkedIn";
import { logger } from "./loggers";
import { fetchJobAsMarkdown } from "./core";

program
  .version(packageJson.version)
  .description("CLI tool to fetch LinkedIn job data and convert to Markdown")
  .option("-u, --url <url>", "LinkedIn job URL")
  .option("-i, --id <id>", "LinkedIn job ID")
  .option("-s, --stdout", "Output markdown to stdout instead of saving to file")
  .option("-o, --output-dir <dir>", "Output directory for saved files (default: job-descriptions)")
  .parse();

const { url, id } = processOptions(program.opts());

(async () => {
  try {
    const fullMarkdown = await fetchJobAsMarkdown({ url: url.toString(), id });

    if (program.opts().stdout) {
      process.stdout.write(fullMarkdown);
    } else {
      const jdsDir = path.resolve(process.cwd(), program.opts().outputDir ?? "job-descriptions");
      if (!fs.existsSync(jdsDir)) {
        fs.mkdirSync(jdsDir, { recursive: true });
      }

      // Extract title from markdown for filename (first # heading)
      const titleMatch = fullMarkdown.match(/^# (.+)$/m);
      const title = titleMatch?.[1] ?? "Job Posting";

      const markdownFilePath = isLinkedInUrl(url)
        ? renameLinkedInJob(title, jdsDir)
        : path.join(jdsDir, `${title.replace(/[^a-z0-9]/gi, "_")}.md`);

      fs.writeFileSync(markdownFilePath, fullMarkdown);
      logger.info(`Markdown content saved to ${markdownFilePath}`);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();

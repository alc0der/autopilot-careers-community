import path from "node:path";
import fs from "node:fs";
import { program } from "commander";
import { renderMarkdownToPdf } from "./renderer/index";
import { mergeResume, jsonResumeToMarkdown, validateJsonResume } from "./converter/index";

program
  .description("Headless Markdown-to-PDF resume renderer");

program
  .command("render", { isDefault: true })
  .description("Render an oh-my-cv markdown resume to PDF")
  .requiredOption("-i, --input <path>", "Path to rendered Markdown file")
  .option("-o, --output <path>", "Output PDF path")
  .option("--html", "Also save intermediate HTML file")
  .option("--browser <name>", "Browser: chrome, chrome-canary, or /path/to/binary")
  .option("--css <path>", "Path to custom CSS file")
  .action(async (opts) => {
    const inputPath = path.resolve(opts.input);
    const outputPath = opts.output
      ? path.resolve(opts.output)
      : inputPath.replace(/\.md$/i, ".pdf");
    const cssPath = opts.css ? path.resolve(opts.css) : undefined;

    try {
      const result = await renderMarkdownToPdf(inputPath, outputPath, {
        html: opts.html,
        browser: opts.browser,
        css: cssPath,
      });
      console.log(`Done! (${result.pageCount} page${result.pageCount !== 1 ? "s" : ""})`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

program
  .command("merge")
  .description("Merge base + contact + AI overlay YAMLs (JSON Resume schema) and render to PDF")
  .requiredOption("--base <path>", "Path to base.yaml")
  .requiredOption("--contact <path>", "Path to contact.yaml")
  .requiredOption("--ai <path>", "Path to AI overlay YAML")
  .requiredOption("-o, --output <path>", "Output PDF path")
  .option("--html", "Also save intermediate HTML file")
  .option("--browser <name>", "Browser: chrome, chrome-canary, or /path/to/binary")
  .option("--css <path>", "Path to custom CSS file")
  .option("--json-only", "Only output merged JSON Resume and markdown (no PDF rendering)")
  .action(async (opts) => {
    const basePath = path.resolve(opts.base);
    const contactPath = path.resolve(opts.contact);
    const aiPath = path.resolve(opts.ai);
    const outputPath = path.resolve(opts.output);
    const cssPath = opts.css ? path.resolve(opts.css) : undefined;

    try {
      // Merge YAML → JSON Resume
      const resume = mergeResume(basePath, contactPath, aiPath);

      // Validate
      const validation = validateJsonResume(resume);
      if (!validation.valid) {
        console.error("Validation errors:");
        validation.errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      // Save JSON Resume document
      const jsonPath = outputPath.replace(/\.pdf$/i, ".json");
      fs.writeFileSync(jsonPath, JSON.stringify(resume, null, 2));
      console.log(`JSON Resume saved to ${jsonPath}`);

      // Convert to markdown
      const markdown = jsonResumeToMarkdown(resume);
      const mdPath = outputPath.replace(/\.pdf$/i, ".md");
      fs.writeFileSync(mdPath, markdown);
      console.log(`Markdown saved to ${mdPath}`);

      if (opts.jsonOnly) return;

      // Render to PDF
      const result = await renderMarkdownToPdf(mdPath, outputPath, {
        html: opts.html,
        browser: opts.browser,
        css: cssPath,
      });
      console.log(`Done! (${result.pageCount} page${result.pageCount !== 1 ? "s" : ""})`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);

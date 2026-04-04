import path from "node:path";
import { program } from "commander";
import { renderMarkdownToPdf } from "./renderer/index";

program
  .description("Render oh-my-cv-compatible Markdown to PDF")
  .requiredOption("-i, --input <path>", "Path to rendered Markdown file")
  .option("-o, --output <path>", "Output PDF path")
  .option("--html", "Also save intermediate HTML file")
  .option("--browser <name>", "Browser: chrome, chrome-canary, or /path/to/binary (default: chrome)")
  .option("--css <path>", "Path to custom CSS file (oh-my-cv format)")
  .parse(process.argv);

const opts = program.opts();
const inputPath = path.resolve(opts.input);
const outputPath = opts.output
  ? path.resolve(opts.output)
  : inputPath.replace(/\.md$/i, ".pdf");
const cssPath = opts.css ? path.resolve(opts.css) : undefined;

renderMarkdownToPdf(inputPath, outputPath, {
  html: opts.html,
  browser: opts.browser,
  css: cssPath,
})
  .then((result) => {
    console.log(`Done! (${result.pageCount} page${result.pageCount !== 1 ? "s" : ""})`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

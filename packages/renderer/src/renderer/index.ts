import fs from "node:fs";
import path from "node:path";
import { markdownToHtml } from "./markdownToHtml";
import { buildCss, DEFAULT_STYLES, type ResumeStyles } from "./cssBuilder";
import { buildHtmlDocument } from "./htmlDocument";
import { generatePdf, type PdfMetadata } from "./pdfGenerator";

export { DEFAULT_STYLES, type ResumeStyles } from "./cssBuilder";
export type { PdfMetadata } from "./pdfGenerator";

export async function renderMarkdownToPdf(
  mdPath: string,
  outputPath: string,
  options: { html?: boolean; browser?: string; styles?: Partial<ResumeStyles>; css?: string; metadata?: PdfMetadata } = {}
): Promise<{ pageCount: number }> {
  const markdown = fs.readFileSync(mdPath, "utf-8");
  const styles = { ...DEFAULT_STYLES, ...options.styles };

  console.log(`Converting ${path.basename(mdPath)} to HTML...`);
  const resumeHtml = markdownToHtml(markdown);

  console.log("Building CSS...");
  const css = buildCss(styles, options.css);

  const htmlDocument = buildHtmlDocument(resumeHtml, css, styles, options.metadata?.title);

  if (options.html) {
    const htmlPath = outputPath.replace(/\.pdf$/i, ".html");
    fs.writeFileSync(htmlPath, htmlDocument);
    console.log(`HTML saved to ${htmlPath}`);
  }

  console.log("Generating PDF...");
  const pageCount = await generatePdf(htmlDocument, outputPath, options.browser, options.metadata);
  console.log(`PDF saved to ${outputPath} (${pageCount} page${pageCount !== 1 ? "s" : ""})`);
  return { pageCount };
}

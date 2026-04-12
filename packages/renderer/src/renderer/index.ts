import fs from "node:fs";
import path from "node:path";
import { markdownToHtml } from "./markdownToHtml";
import { buildCss, DEFAULT_STYLES, type ResumeStyles } from "./cssBuilder";
import { buildHtmlDocument } from "./htmlDocument";
import { generatePdf, generatePdfToBuffer, type PdfMetadata } from "./pdfGenerator";

export { DEFAULT_STYLES, type ResumeStyles } from "./cssBuilder";
export type { PdfMetadata } from "./pdfGenerator";

/**
 * Pure-transform renderer: markdown string in, PDF bytes out.
 * No filesystem I/O — suitable for remote/inline mode.
 */
export async function renderMarkdownContent(
  markdown: string,
  options: {
    css?: string;
    styles?: Partial<ResumeStyles>;
    browser?: string;
    metadata?: PdfMetadata;
  } = {},
): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
  const styles = { ...DEFAULT_STYLES, ...options.styles };

  console.log("Converting markdown to HTML...");
  const resumeHtml = markdownToHtml(markdown);

  console.log("Building CSS...");
  const css = buildCss(styles, options.css);

  const htmlDocument = buildHtmlDocument(resumeHtml, css, styles, options.metadata?.title);

  console.log("Generating PDF...");
  return generatePdfToBuffer(htmlDocument, options.browser, options.metadata);
}

/**
 * File-based renderer: reads markdown from disk, writes PDF to disk.
 * Backwards-compatible entry point for local mode.
 */
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

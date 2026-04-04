import { program } from "commander";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
// import { log } from "console";

export function extractReadModeHTML(htmlContent: string): string {
  const dom = new JSDOM(htmlContent);
  const reader = new Readability(dom.window.document, { debug: true, charThreshold: 2500 });
  const article = reader.parse();
  if (!article) {
    throw new Error("Failed to parse article content");
  }
  //   const yamlMeta = `---
  // rel:source: ${program.opts().url}
  // tags:
  //   - jd
  // ---\n\n`;

  // log(article.content);

  // .replace(/\n\s+/g, " ") // Remove indentation
  // .replace(/\n{2,}/g, "\n\n") // Ensure proper paragraph separation
  // .trim();

  return article.content;
}

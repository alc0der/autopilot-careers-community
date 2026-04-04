import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

export type HtmlArticle = {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
};

export function extractArticle(html: string): HtmlArticle {
  const dom = new JSDOM(html);
  // if (!isProbablyReaderable(dom.window.document)) {
  //   console.warn("Document might not be readable");
  //   throw new Error("Document is not readable");
  // }
  const reader = new Readability(dom.window.document, {
    debug: false,
    nbTopCandidates: 10,
    charThreshold: 5000,
  });
  const article = reader.parse();

  if (!article) {
    throw new Error("Failed to parse article from HTML");
  }

  return article;
}

export function removeBrInsideStrong(element: Element): Element {
  const strongElements = element.querySelectorAll("strong");
  strongElements.forEach((strong) => {
    const brTags = strong.querySelectorAll("br");
    brTags.forEach((br) => {
      br.parentNode?.removeChild(br);
    });
  });
  return element;
}

export function htmlToMarkdown(article: HtmlArticle): string {
  const dom = new JSDOM(article.content);
  const document = dom.window.document;
  // Extract the article content, falling back to the document body if no article element is found
  const articleElement = document.querySelector("article") || document.body;
  if (!articleElement) {
    throw new Error("No content found in the HTML");
  }

  // Remove span tags
  const spans = articleElement.querySelectorAll("span");
  spans.forEach((span) => {
    if (span.parentNode) {
      while (span.firstChild) {
        span.parentNode.insertBefore(span.firstChild, span);
      }
      span.parentNode.removeChild(span);
    }
  });

  const withoutBrInStrong = removeBrInsideStrong(articleElement);

  const modifiedHtml = withoutBrInStrong.innerHTML.replace(
    /<!--[\s\S]*?-->/g,
    "",
  );
  // console.log(modifiedHtml);

  const turndownService = new TurndownService({
    bulletListMarker: "-",
    headingStyle: "atx",
  });
  let markdown = turndownService.turndown(modifiedHtml);

  // console.log(markdown);

  return markdown;
}

import * as fs from "fs";
import {
  HtmlArticle,
  htmlToMarkdown,
  removeBrInsideStrong,
} from "../src/htmlToMarkdown";
import { verify } from "approvals/lib/Providers/Jest/JestApprovals";
import { configure } from "approvals/lib/config";
import { JestReporter } from "approvals/lib/Providers/Jest/JestReporter";
import { JSDOM } from "jsdom";

function createBasicHtmlArticle(content: string): HtmlArticle {
  return {
    content,
    title: "",
    textContent: "",
    length: 0,
    excerpt: "",
    siteName: "",
    byline: "",
    dir: "",
    lang: "",
  };
}

describe("htmlToMarkdown", () => {
  it("Extract article content", () => {
    const html = createBasicHtmlArticle(
      `<div>before</div><article>Article content</article><div>after</div>`,
    );

    const result = htmlToMarkdown(html);
    expect(result).toBe("Article content");
  });

  beforeAll(() => {
    configure({
      reporters: ["gitdiff"],
    });
  });

  it("Remove HTML comments", () => {
    const html = createBasicHtmlArticle(
      `<article><!---->Paragraph<!----></article>`,
    );

    const result = htmlToMarkdown(html);
    expect(result).toBe("Paragraph");
  });

  it("Remove br tags inside strong tags", () => {
    const strongElement = new JSDOM(
      "<article><strong>Company Description<br><br></strong></article>",
    ).window.document.querySelector("article");
    console.log(strongElement?.innerHTML);
    if (strongElement === null) {
      throw new Error("Strong element not found");
    }
    const result = removeBrInsideStrong(strongElement);
    expect(result.innerHTML).toBe("<strong>Company Description</strong>");
  });

  // it("adds linefeed after strong with no whitespace", () => {
  //   const strongElement = new JSDOM(
  //     "<article><strong>Company Description</strong>Dropbox</article>",
  //   ).window.document.querySelector("article");
  //   console.log(strongElement?.innerHTML);
  //   if (strongElement === null) {
  //     throw new Error("Strong element not found");
  //   }

  //   const result = addBrAfterStrongWithNoWhitespace(strongElement);

  //   expect(result).toBe("<strong>Company Description</strong><br>Dropbox");
  // });

  it("Remove span tags from lists", () => {
    const html = createBasicHtmlArticle(
      `<article><ul><span><li>test 1</li></span><span><li>test 2</li></span></ul></article>`,
    );

    const result = htmlToMarkdown(html);
    expect(result).toBe("-   test 1\n-   test 2");
  });
});

import * as fs from "fs";
import { HtmlArticle, htmlToMarkdown } from "../src/htmlToMarkdown";
import { verify } from "approvals/lib/Providers/Jest/JestApprovals";
import { configure } from "approvals/lib/config";
import { JestReporter } from "approvals/lib/Providers/Jest/JestReporter";

xdescribe("htmlToMarkdown", () => {
  it.todo("");
  // beforeAll(() => {
  //   configure({
  //     reporters: ["gitdiff"],
  //   });
  // });
  // it("converts HTML to Markdown", () => {
  //   const html: HtmlArticle = {
  //     content: fs.readFileSync("out/4005493592-article.html", "utf8"),
  //     title: "",
  //     textContent: "",
  //     length: 0,
  //     excerpt: "",
  //     siteName: "",
  //     byline: "",
  //     dir: "",
  //     lang: "",
  //   };
  //   const result = htmlToMarkdown(html);
  //   expect(result).toBeDefined();
  //   expect(typeof result).toBe("string");
  //   verify(result);
  // });
});

import { extractReadModeHTML } from "../src/markdownProcessor";
import fs from "fs";
import path from "path";

describe("Markdown Processor", () => {
  xit("should convert HTML to Markdown correctly", () => {
    const htmlFilePath = path.resolve(__dirname, "../out/page.html");
    const expectedMarkdownPath = path.resolve(__dirname, "../out/expected.md");

    const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");
    const expectedMarkdown = fs.readFileSync(expectedMarkdownPath, "utf-8");

    const generatedMarkdown = extractReadModeHTML(htmlContent);

    const outputMarkdownPath = path.resolve(
      __dirname,
      "../out/3989104441-test.md",
    );
    fs.writeFileSync(outputMarkdownPath, generatedMarkdown);

    expect(generatedMarkdown.trim()).toBe(expectedMarkdown.trim());
  });
});

import MarkdownIt from "markdown-it";
// @ts-expect-error missing types
import MarkdownItDeflist from "markdown-it-deflist";
// @ts-expect-error missing types
import LinkAttributes from "markdown-it-link-attributes";
import * as yamlParser from "js-yaml";
import { expandIcons } from "../converter/icons";

type ResumeHeaderItem = {
  readonly text: string;
  readonly link?: string;
  readonly newLine?: boolean;
};

type ResumeFrontMatter = {
  readonly name?: string;
  readonly header?: Array<ResumeHeaderItem>;
};

const OPTIONAL_BYTE_ORDER_MARK = "\\ufeff?";
const PLATFORM = typeof process !== "undefined" ? process.platform : "";
const FM_PATTERN =
  "^(" +
  OPTIONAL_BYTE_ORDER_MARK +
  "(= yaml =|---)" +
  "$([\\s\\S]*?)" +
  "^(?:\\2|\\.\\.\\.)\\s*" +
  "$" +
  (PLATFORM === "win32" ? "\\r?" : "") +
  "(?:\\n)?)";

function parseFrontMatter(content: string): { body: string; frontMatter: ResumeFrontMatter } {
  const lines = content.split(/(\r?\n)/);
  if (!lines[0] || !/= yaml =|---/.test(lines[0])) {
    return { frontMatter: {} as ResumeFrontMatter, body: content };
  }

  const regex = new RegExp(FM_PATTERN, "m");
  const match = regex.exec(content);

  if (!match) {
    return { frontMatter: {} as ResumeFrontMatter, body: content };
  }

  const frontMatterString = match[match.length - 1].trim();
  const body = content.slice(match[0].length);
  const frontMatter = (yamlParser.load(frontMatterString) || {}) as ResumeFrontMatter;

  return { body, frontMatter };
}

function renderHeaderItem(item: ResumeHeaderItem, hasSeparator: boolean): string {
  const text = expandIcons(item.text);
  const content = item.link
    ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">${text}</a>`
    : text;

  const element = `<span class="resume-header-item ${hasSeparator ? "" : "no-separator"}">
      ${content}
    </span>`;

  return item.newLine ? `<br>\n${element}` : element;
}

function renderHeader(frontMatter: ResumeFrontMatter): string {
  const content = [
    frontMatter.name ? `<h1>${frontMatter.name}</h1>\n` : "",
    (frontMatter.header ?? [])
      .map((item, i, array) =>
        renderHeaderItem(item, i !== array.length - 1 && !array[i + 1].newLine)
      )
      .join("\n")
  ].join("");

  return `<div class="resume-header">${content}</div>`;
}

function resolveDeflist(html: string): string {
  return html.replace(/<dl>([\s\S]*?)<\/dl>/g, (match) =>
    match.replace(/<\/dd>\n<dt>/g, "</dd>\n</dl>\n<dl>\n<dt>")
  );
}

const md = new MarkdownIt({ html: true });
md.use(MarkdownItDeflist);
md.use(LinkAttributes, {
  matcher: (link: string) => /^https?:\/\//.test(link),
  attrs: {
    target: "_blank",
    rel: "noopener"
  }
});

export function markdownToHtml(markdownWithFrontmatter: string): string {
  const { body, frontMatter } = parseFrontMatter(markdownWithFrontmatter);
  const content = resolveDeflist(md.render(expandIcons(body)));
  const header = renderHeader(frontMatter);
  return header + content;
}

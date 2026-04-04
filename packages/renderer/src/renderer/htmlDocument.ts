import { type ResumeStyles, DEFAULT_STYLES } from "./cssBuilder";

// A4 dimensions in px at 96 DPI: 794 x 1123
const PAPER_WIDTH: Record<string, number> = {
  A4: 794,
  Letter: 816,
};

export function buildHtmlDocument(
  resumeHtml: string,
  css: string,
  styles: ResumeStyles = DEFAULT_STYLES,
  title?: string,
): string {
  const width = PAPER_WIDTH[styles.paper] ?? PAPER_WIDTH.A4;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ?? "Resume"}</title>
  <style>
    ${css}
  </style>
  <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"><\/script>
</head>
<body>
  <div id="resume" style="
    width: ${width}px;
    padding: ${styles.marginV}px ${styles.marginH}px;
    background-color: white;
    color: black;
  ">
    ${resumeHtml}
  </div>
</body>
</html>`;
}

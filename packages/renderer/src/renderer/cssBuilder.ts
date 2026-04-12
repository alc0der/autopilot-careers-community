import fs from "node:fs";
import {
  tailwindResetCss,
  resumeTemplateCss,
  fontRegular,
  fontBold,
  fontItalic,
  fontBoldItalic,
} from "./assets";

export type ResumeStyles = {
  marginV: number;
  marginH: number;
  lineHeight: number;
  paragraphSpace: number;
  themeColor: string;
  fontEN: string;
  fontSize: number;
  paper: string;
};

export const DEFAULT_STYLES: ResumeStyles = {
  marginV: 50,
  marginH: 45,
  lineHeight: 1.3,
  paragraphSpace: 5,
  themeColor: "#377bb5",
  fontEN: "Minion Pro",
  fontSize: 15,
  paper: "A4",
};

const S = "#resume";

function loadResetCss(): string {
  return tailwindResetCss;
}

function preprocessCss(raw: string): string {
  let css = raw;

  // Rewrite vue-smart-pages wrapper selector to #resume
  css = css.replace(
    /#resume-preview\s+\[data-scope="vue-smart-pages"\]\[data-part="page"\]/g,
    "#resume"
  );

  // Rewrite remaining #resume-preview selectors to #resume
  css = css.replace(/#resume-preview/g, "#resume");

  // Strip .dark #resume rules
  css = css.replace(/\.dark\s+#resume[^{]*\{[^}]*\}/g, "");

  // Strip @media print blocks containing .dark rules
  css = css.replace(/@media\s+print\s*\{[^}]*\.dark[^}]*\{[^}]*\}\s*\}/g, "");

  // Clean up excess blank lines left by stripping
  css = css.replace(/\n{3,}/g, "\n\n");

  return css.trim();
}

function loadDefaultTemplateCss(): string {
  return preprocessCss(resumeTemplateCss);
}

function loadUserCss(cssPathOrContent?: string): string {
  if (!cssPathOrContent) return "";
  if (cssPathOrContent.startsWith("/")) {
    // Absolute path — read from disk
    let raw: string;
    try {
      raw = fs.readFileSync(cssPathOrContent, "utf-8");
    } catch {
      console.warn(`Warning: CSS file not found at ${cssPathOrContent}, skipping user CSS.`);
      return "";
    }
    return preprocessCss(raw);
  }
  // Inline CSS content
  return preprocessCss(cssPathOrContent);
}

function buildDynamicCss(styles: ResumeStyles): string {
  const s = S;
  const height = styles.lineHeight;

  const fontFamily = `${s} { font-family: "${styles.fontEN}", Arial, Helvetica, sans-serif; }`;
  const fontSize = `${s} { font-size: ${styles.fontSize}px; }`;
  const themeColor =
    `${s} h1, ${s} h2, ${s} h3 { color: ${styles.themeColor}; }` +
    `${s} h2 { border-bottom-color: ${styles.themeColor}; }`;
  const paragraphSpace = `${s} h2 { margin-top: ${styles.paragraphSpace}px; }`;
  const lineHeight =
    `${s} p, ${s} li { line-height: ${height.toFixed(2)}; }` +
    `${s} h2, ${s} h3 { line-height: ${(height * 1.154).toFixed(2)}; }` +
    `${s} dl { line-height: ${(height * 1.038).toFixed(2)}; }`;

  return fontFamily + fontSize + themeColor + paragraphSpace + lineHeight;
}

const FONT_VARIANTS = [
  { base64: fontRegular, weight: "normal", style: "normal" },
  { base64: fontBold, weight: "bold", style: "normal" },
  { base64: fontItalic, weight: "normal", style: "italic" },
  { base64: fontBoldItalic, weight: "bold", style: "italic" },
];

function buildFontFaceCss(): string {
  return FONT_VARIANTS
    .map(({ base64, weight, style }) =>
      `@font-face {
  font-family: "Minion Pro";
  src: url("data:font/opentype;base64,${base64}") format("opentype");
  font-weight: ${weight};
  font-style: ${style};
}`)
    .join("\n\n");
}

const RESET_OVERRIDES = `
/* Tailwind reset sets svg to display:block; restore inline-block for Iconify icons */
svg.iconify { display: inline-block; }
`;

/* Applied after user CSS to override style.css hyphens: auto */
const POST_USER_OVERRIDES = `
#resume { -moz-hyphens: none; -ms-hyphens: none; -webkit-hyphens: none; hyphens: none; }
`;

const PRINT_CSS = `@page {
  margin: 0;
  size: A4;
}

@media print {
  #resume {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`;

export function buildCss(styles: ResumeStyles = DEFAULT_STYLES, cssPath?: string): string {
  return [
    loadResetCss(),
    RESET_OVERRIDES,
    buildFontFaceCss(),
    loadDefaultTemplateCss(),
    loadUserCss(cssPath),
    POST_USER_OVERRIDES,
    buildDynamicCss(styles),
    PRINT_CSS,
  ].join("\n\n");
}

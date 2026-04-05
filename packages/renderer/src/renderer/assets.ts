// esbuild inlines these at build time via loader config:
//   .css  → text (string)
//   .otf  → base64 (base64-encoded string)

// @ts-ignore esbuild text loader
import tailwindResetCss from "../../assets/css/tailwind-reset.css";
// @ts-ignore esbuild text loader
import resumeTemplateCss from "../../assets/css/resume-template.css";
// @ts-ignore esbuild base64 loader
import fontRegular from "../../assets/fonts/minion-pro/regular.otf";
// @ts-ignore esbuild base64 loader
import fontBold from "../../assets/fonts/minion-pro/bold.otf";
// @ts-ignore esbuild base64 loader
import fontItalic from "../../assets/fonts/minion-pro/italic.otf";
// @ts-ignore esbuild base64 loader
import fontBoldItalic from "../../assets/fonts/minion-pro/bolditalic.otf";

export { tailwindResetCss, resumeTemplateCss, fontRegular, fontBold, fontItalic, fontBoldItalic };

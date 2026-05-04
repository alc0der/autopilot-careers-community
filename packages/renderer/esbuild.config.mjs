import { build } from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  external: ["puppeteer-core", "express"],
  loader: {
    ".css": "text",
    ".otf": "base64",
  },
};

await build({
  ...shared,
  entryPoints: ["src/cli.ts"],
  outfile: "bundle/oh-my-cv-render.js",
  banner: { js: "#!/usr/bin/env node" },
});

await build({
  ...shared,
  entryPoints: ["src/mcp.ts"],
  outfile: "bundle/oh-my-cv-render-mcp.js",
});

console.log("Built bundle/oh-my-cv-render.js");
console.log("Built bundle/oh-my-cv-render-mcp.js");

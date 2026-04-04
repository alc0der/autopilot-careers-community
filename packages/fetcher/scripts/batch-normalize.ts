#!/usr/bin/env ts-node
/**
 * Batch-normalize raw JD files that don't yet have a _JD.md counterpart.
 *
 * Usage: ts-node scripts/batch-normalize.ts <job-descriptions-dir>
 */

import * as fs from "fs";
import * as path from "path";
import { normalizeMarkdown } from "../src/normalizeMarkdown";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: ts-node scripts/batch-normalize.ts <job-descriptions-dir>");
  process.exit(1);
}

const absDir = path.resolve(dir);
const files = fs.readdirSync(absDir).filter((f) => f.endsWith("_JD_Raw.md"));

let processed = 0;
let skipped = 0;

for (const rawName of files) {
  const lintedName = rawName.replace("_JD_Raw.md", "_JD.md");
  const lintedPath = path.join(absDir, lintedName);

  if (fs.existsSync(lintedPath)) {
    skipped++;
    continue;
  }

  const rawPath = path.join(absDir, rawName);
  let content = fs.readFileSync(rawPath, "utf-8");

  // Add rel:raw to frontmatter
  if (content.startsWith("---")) {
    const endIdx = content.indexOf("---", 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(0, endIdx);
      if (!frontmatter.includes("rel:raw:")) {
        content =
          frontmatter + `rel:raw: ${rawName}\n` + content.slice(endIdx);
      }
    }
  }

  const normalized = normalizeMarkdown(content);
  fs.writeFileSync(lintedPath, normalized, "utf-8");
  console.log(`  ✓ ${rawName} → ${lintedName}`);
  processed++;
}

console.log(`\nDone: ${processed} normalized, ${skipped} already existed.`);

#!/usr/bin/env node
/**
 * Migration script: Convert AI YAML files from old format to JSON Resume schema.
 *
 * Changes:
 *   - jobs → work, id → x-id, achievements → highlights
 *   - skill_groups → skills, category → name, skills (HTML string) → keywords (array)
 *   - tagline → basics.label
 *   - HTML Iconify spans → :set--name: shortcodes
 *
 * Usage: node migrate-ai-yaml.mjs <directory>
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node migrate-ai-yaml.mjs <resumes-directory>");
  process.exit(1);
}

const HTML_ICON_RE = /<span\s+class="iconify"\s+data-icon="([^"]+)"\s*><\/span>/g;

/** Convert HTML icon spans to :set--name: shortcodes */
function htmlToShortcodes(text) {
  return text.replace(HTML_ICON_RE, (_match, icon) => {
    const code = icon.replace(":", "--");
    return `:${code}:`;
  });
}

/** Split a comma-separated skills HTML string into keyword array with shortcodes.
 *  Respects parentheses — commas inside (...) are not split points. */
function parseSkillsString(skillsHtml) {
  if (!skillsHtml || typeof skillsHtml !== "string" || skillsHtml.trim() === "") return [];

  // First convert all HTML icons to shortcodes
  const withShortcodes = htmlToShortcodes(skillsHtml);

  // Split by commas that are not inside parentheses
  const keywords = [];
  let current = "";
  let depth = 0;
  for (const ch of withShortcodes) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) keywords.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const last = current.trim();
  if (last) keywords.push(last);

  return keywords;
}

/** Migrate a single AI YAML object from old format to new */
function migrateAiYaml(data) {
  const result = {};

  // tagline → basics.label
  if (data.tagline) {
    result.basics = { label: data.tagline };
  }

  // jobs → work
  if (data.jobs && Array.isArray(data.jobs)) {
    result.work = data.jobs.map((job) => {
      const entry = {};
      if (job.id) entry["x-id"] = job.id;
      if (job.achievements) {
        entry.highlights = job.achievements.map((a) =>
          typeof a === "string" ? htmlToShortcodes(a) : a
        );
      }
      return entry;
    });
  }

  // skill_groups → skills
  if (data.skill_groups && Array.isArray(data.skill_groups)) {
    result.skills = data.skill_groups.map((group) => {
      const entry = {};
      if (group.category) entry.name = group.category;
      if (group.skills !== undefined) {
        entry.keywords = parseSkillsString(group.skills);
      }
      return entry;
    });
  }

  return result;
}

/** Normalize an already-migrated file — e.g. fix keywords that were badly split */
function normalizeAlreadyMigrated(data) {
  const result = {};
  if (data.basics) result.basics = data.basics;
  if (data.work) result.work = data.work;
  if (data.skills) {
    result.skills = data.skills.map((group) => {
      const entry = {};
      if (group.name) entry.name = group.name;
      if (group.keywords) {
        // Re-join and re-split keywords to fix bad splits
        // (e.g., "AWS (EKS" + "Lambda" + "CloudWatch)" should be one keyword)
        const joined = group.keywords.join(", ");
        entry.keywords = parseSkillsString(joined);
      }
      return entry;
    });
  }
  return result;
}

// Process all YAML files in the directory
const files = fs.readdirSync(dir).filter((f) => f.endsWith("_ai.yaml"));
console.log(`Found ${files.length} AI YAML files to migrate`);

let migrated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(content);

  if (!data) {
    console.log(`  SKIP (empty): ${file}`);
    skipped++;
    continue;
  }

  // Handle both old format (jobs/skill_groups) and already-migrated format (work/skills)
  let migrated_data;
  if (data.work && !data.jobs) {
    // Already migrated — just normalize (fixes broken skills splits from previous runs)
    migrated_data = normalizeAlreadyMigrated(data);
  } else {
    migrated_data = migrateAiYaml(data);
  }
  const newYaml = yaml.dump(migrated_data, {
    lineWidth: -1,        // Don't wrap lines
    quotingType: '"',     // Use double quotes
    forceQuotes: false,   // Only quote when needed
    noRefs: true,         // Don't use YAML references
  });

  fs.writeFileSync(filePath, newYaml);
  console.log(`  DONE: ${file}`);
  migrated++;
}

console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`);

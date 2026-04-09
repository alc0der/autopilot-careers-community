/**
 * Quick test: merge base + contact + AI YAML and output markdown.
 * Run: node --import tsx test/test-converter.mjs
 */
import { mergeResumeData } from "../src/converter/merger.ts";
import { jsonResumeToMarkdown } from "../src/converter/toMarkdown.ts";
import { validateJsonResume } from "../src/converter/validate.ts";
import { expandIcons, htmlToShortcodes } from "../src/converter/icons.ts";
import fs from "node:fs";
import yaml from "js-yaml";

const BASE = "/Users/alc0der/Documents/Projects/Career on Autopilot/base.yaml";
const CONTACT = "/Users/alc0der/Documents/Projects/Career on Autopilot/contact.yaml";
const AI = "/Users/alc0der/Documents/Projects/Career on Autopilot/resumes/20260324_Careem_Staff_Software_Engineer_I_ai.yaml";

// Test icon expansion
console.log("=== Icon Tests ===");
console.log(expandIcons(":devicon--java:"));
console.log(expandIcons(":vscode-icons--file-type-aws: AWS"));
console.log(expandIcons("No icons here"));
console.log(htmlToShortcodes('<span class="iconify" data-icon="devicon:java"></span>'));
console.log();

// Load and merge
const base = yaml.load(fs.readFileSync(BASE, "utf-8"));
const contact = yaml.load(fs.readFileSync(CONTACT, "utf-8"));
const overlay = yaml.load(fs.readFileSync(AI, "utf-8"));

console.log("=== Merge ===");
const resume = mergeResumeData(base, contact, overlay);
console.log("Merged basics.name:", resume.basics?.name);
console.log("Merged basics.label:", resume.basics?.label);
console.log("Merged work count:", resume.work?.length);
console.log("Merged skills count:", resume.skills?.length);
console.log("Years experience:", resume["x-yearsExperience"]);
console.log();

// Validate
console.log("=== Validation ===");
const validation = validateJsonResume(resume);
console.log("Valid:", validation.valid);
if (!validation.valid) {
  console.log("Errors:", validation.errors);
}
console.log();

// Convert to markdown
console.log("=== Markdown Output ===");
const markdown = jsonResumeToMarkdown(resume);
console.log(markdown);

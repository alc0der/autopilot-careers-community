/**
 * 3-file YAML merger: base + contact + AI overlay → JSON Resume document.
 *
 * Replaces the bash/python3/jq pipeline in render.sh.
 */

import fs from "node:fs";
import * as yaml from "js-yaml";
import type {
  JsonResume,
  JsonResumeWork,
  JsonResumeSkill,
  ResumeBase,
  ResumeContact,
  ResumeOverlay,
} from "./types";

/**
 * Merge three YAML files into a single JSON Resume document.
 *
 * @param basePath    Path to base.yaml (work, education, skills)
 * @param contactPath Path to contact.yaml (basics)
 * @param aiPath      Path to AI overlay YAML (tailored highlights, skills, label)
 */
export function mergeResume(basePath: string, contactPath: string, aiPath: string): JsonResume {
  const base = yaml.load(fs.readFileSync(basePath, "utf-8")) as ResumeBase;
  const contact = yaml.load(fs.readFileSync(contactPath, "utf-8")) as ResumeContact;
  const overlay = yaml.load(fs.readFileSync(aiPath, "utf-8")) as ResumeOverlay;

  return mergeResumeData(base, contact, overlay);
}

/** Pure merge function (no file I/O) for testability. */
export function mergeResumeData(
  base: ResumeBase,
  contact: ResumeContact,
  overlay: ResumeOverlay,
): JsonResume {
  const phoneLink = (contact.phone ?? "").replace(/[^+0-9]/g, "");
  const yearsExperience = computeYearsExperience(base.work ?? []);

  // Merge work entries: base provides structure, overlay provides highlights
  const work = (base.work ?? []).map((job) => {
    const match = (overlay.work ?? []).find((o) => o["x-id"] === job["x-id"]);
    return { ...job, ...(match ? { highlights: match.highlights } : {}) };
  });

  // Merge skills: base provides categories, overlay provides keywords
  const skills = (base.skills ?? []).map((group) => {
    const match = (overlay.skills ?? []).find((o) => o.name === group.name);
    return { ...group, ...(match ? { keywords: match.keywords } : {}) };
  });

  // Build basics from contact + overlay label
  const basics = {
    ...contact,
    "x-phoneLink": phoneLink,
    ...(overlay.basics?.label ? { label: overlay.basics.label } : {}),
  };

  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics,
    work,
    education: base.education ?? [],
    skills,
    "x-yearsExperience": String(yearsExperience),
    meta: {
      version: "v1.0.0",
      lastModified: new Date().toISOString(),
    },
  };
}

/** Compute years of experience from the earliest work startDate. */
function computeYearsExperience(work: JsonResumeWork[]): number {
  if (work.length === 0) return 0;

  const years = work
    .map((job) => parseStartYear(job.startDate))
    .filter((y): y is number => y !== undefined);

  if (years.length === 0) return 0;

  const earliest = Math.min(...years);
  return new Date().getFullYear() - earliest;
}

/** Parse a start year from ISO 8601 partial date (YYYY, YYYY-MM, YYYY-MM-DD). */
function parseStartYear(date?: string): number | undefined {
  if (!date) return undefined;
  const year = parseInt(date.substring(0, 4), 10);
  return isNaN(year) ? undefined : year;
}

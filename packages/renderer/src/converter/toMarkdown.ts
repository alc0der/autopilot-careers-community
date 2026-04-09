/**
 * Convert a JSON Resume document to oh-my-cv markdown format.
 *
 * Replaces the mustache template.md + Go mustache CLI.
 * Output is consumed by markdownToHtml.ts (markdown-it + definition lists).
 */

import type { JsonResume, JsonResumeBasics, JsonResumeProfile } from "./types";
import { expandIcons } from "./icons";

/** Header icon shortcodes for contact fields. */
const HEADER_ICONS: Record<string, string> = {
  phone: ":tabler--phone:",
  email: ":tabler--mail:",
  github: ":tabler--brand-github:",
  linkedin: ":tabler--brand-linkedin:",
  website: ":charm--person:",
  location: ":ic--outline-location-on:",
  visa: ":mdi--passport-biometric:",
};

/** Convert a JSON Resume document to oh-my-cv markdown. */
export function jsonResumeToMarkdown(resume: JsonResume): string {
  const parts: string[] = [];

  parts.push(buildFrontMatter(resume));
  parts.push("");
  parts.push(buildWorkSection(resume));
  parts.push(buildEducationSection(resume));
  parts.push(buildSkillsSection(resume));

  return parts.join("\n");
}

function buildFrontMatter(resume: JsonResume): string {
  const basics = resume.basics ?? {};
  const label = basics.label ?? "";
  const nameDisplay = label
    ? `${basics.name} <br><small>${label}</small>`
    : (basics.name ?? "");

  const headerItems = buildHeaderItems(basics);

  const lines: string[] = ["---"];
  lines.push(`name: ${nameDisplay}`);
  lines.push("header:");
  for (const item of headerItems) {
    lines.push(`  - text: ${item.text}`);
    if (item.link) lines.push(`    link: ${item.link}`);
    if (item.newLine) lines.push(`    newLine: true`);
  }
  lines.push("---");

  return lines.join("\n");
}

type HeaderItem = { text: string; link?: string; newLine?: boolean };

function buildHeaderItems(basics: JsonResumeBasics): HeaderItem[] {
  const items: HeaderItem[] = [];

  if (basics.phone) {
    items.push({
      text: `${expandIcons(HEADER_ICONS.phone)} ${basics.phone}`,
      link: `tel:${basics["x-phoneLink"] ?? basics.phone}`,
    });
  }

  if (basics.email) {
    items.push({
      text: `${expandIcons(HEADER_ICONS.email)} ${basics.email}`,
      link: `mailto:${basics.email}`,
    });
  }

  const github = findProfile(basics.profiles, "GitHub");
  if (github) {
    items.push({
      text: `${expandIcons(HEADER_ICONS.github)} ${github.username}`,
      link: github.url ?? `https://github.com/${github.username}`,
    });
  }

  const linkedin = findProfile(basics.profiles, "LinkedIn");
  if (linkedin) {
    items.push({
      text: `${expandIcons(HEADER_ICONS.linkedin)} ${linkedin.username}`,
      link: linkedin.url ?? `https://www.linkedin.com/in/${linkedin.username}/`,
    });
  }

  if (basics.url) {
    items.push({
      text: `${expandIcons(HEADER_ICONS.website)} ${basics.url}`,
      link: basics.url,
      newLine: true,
    });
  }

  const locationStr = formatLocation(basics);
  if (locationStr) {
    items.push({ text: `${expandIcons(HEADER_ICONS.location)} ${locationStr}` });
  }

  if (basics["x-visa"]) {
    items.push({ text: `${expandIcons(HEADER_ICONS.visa)} ${basics["x-visa"]}` });
  }

  return items;
}

function findProfile(
  profiles: JsonResumeProfile[] | undefined,
  network: string,
): JsonResumeProfile | undefined {
  return profiles?.find((p) => p.network?.toLowerCase() === network.toLowerCase());
}

function formatLocation(basics: JsonResumeBasics): string {
  const loc = basics.location;
  if (!loc) return "";
  const parts = [loc.city, loc.region].filter(Boolean);
  return parts.join(", ");
}

function buildWorkSection(resume: JsonResume): string {
  const work = resume.work ?? [];
  if (work.length === 0) return "";

  const years = resume["x-yearsExperience"] ?? "0";
  const lines: string[] = [`## Work Experience <span>${years}+ years</span>`, ""];

  for (const job of work) {
    lines.push(`**${job.position}** | ${job.name}`);
    lines.push(`  ~ ${job.location} | ${formatDateRange(job.startDate, job.endDate)}`);
    lines.push("");

    const highlights = job.highlights ?? [];
    for (const h of highlights) {
      lines.push(`- ${expandIcons(h)}`);
    }
    if (highlights.length > 0) lines.push("");
  }

  return lines.join("\n");
}

function buildEducationSection(resume: JsonResume): string {
  const education = resume.education ?? [];
  if (education.length === 0) return "";

  const lines: string[] = ["## Education", ""];

  for (const edu of education) {
    const location = edu["x-location"] ?? "";
    lines.push(`**${edu.institution}**`);
    lines.push(`  ~ ${location}`);
    lines.push("");

    const degree = formatDegree(edu.studyType, edu.area);
    lines.push(degree);
    lines.push(`  ~ ${formatDateRange(edu.startDate, edu.endDate)}`);
    lines.push("");
  }

  return lines.join("\n");
}

function buildSkillsSection(resume: JsonResume): string {
  const skills = resume.skills ?? [];
  if (skills.length === 0) return "";

  const lines: string[] = ["## Skills", ""];

  for (const group of skills) {
    const keywords = (group.keywords ?? []).map(expandIcons).join(", ");
    lines.push(`**${group.name}:** ${keywords}`);
  }
  lines.push("");

  return lines.join("\n");
}

/** Format an ISO 8601 partial date for display. */
function formatDisplayDate(date?: string): string {
  if (!date) return "Present";

  // YYYY-MM → MM/YYYY
  const isoMonthMatch = date.match(/^(\d{4})-(\d{2})$/);
  if (isoMonthMatch) return `${isoMonthMatch[2]}/${isoMonthMatch[1]}`;

  // YYYY-MM-DD → MM/YYYY
  const isoFullMatch = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (isoFullMatch) return `${isoFullMatch[2]}/${isoFullMatch[1]}`;

  // YYYY → YYYY (year only)
  return date;
}

function formatDateRange(start?: string, end?: string): string {
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function formatDegree(studyType?: string, area?: string): string {
  const parts = [studyType, area].filter(Boolean);
  return parts.length > 0 ? parts.join(" in ") : "";
}

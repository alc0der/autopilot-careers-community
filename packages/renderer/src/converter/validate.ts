/**
 * JSON Resume schema validation using zod (already a project dependency).
 *
 * Validates the merged JSON Resume document structure.
 * Custom x- fields are allowed (JSON Resume schema has additionalProperties: true).
 */

import { z } from "zod/v4";
import type { JsonResume } from "./types";

const iso8601Date = z.string().regex(
  /^([1-2]\d{3}-[0-1]\d-[0-3]\d|[1-2]\d{3}-[0-1]\d|[1-2]\d{3})$/,
  "Date must be ISO 8601 partial: YYYY, YYYY-MM, or YYYY-MM-DD",
);

const locationSchema = z.object({
  address: z.optional(z.string()),
  postalCode: z.optional(z.string()),
  city: z.optional(z.string()),
  countryCode: z.optional(z.string()),
  region: z.optional(z.string()),
}).passthrough();

const profileSchema = z.object({
  network: z.optional(z.string()),
  username: z.optional(z.string()),
  url: z.optional(z.string()),
}).passthrough();

const basicsSchema = z.object({
  name: z.optional(z.string()),
  label: z.optional(z.string()),
  image: z.optional(z.string()),
  email: z.optional(z.string()),
  phone: z.optional(z.string()),
  url: z.optional(z.string()),
  summary: z.optional(z.string()),
  location: z.optional(locationSchema),
  profiles: z.optional(z.array(profileSchema)),
}).passthrough();

const workSchema = z.object({
  name: z.optional(z.string()),
  location: z.optional(z.string()),
  description: z.optional(z.string()),
  position: z.optional(z.string()),
  url: z.optional(z.string()),
  startDate: z.optional(iso8601Date),
  endDate: z.optional(iso8601Date),
  summary: z.optional(z.string()),
  highlights: z.optional(z.array(z.string())),
}).passthrough();

const educationSchema = z.object({
  institution: z.optional(z.string()),
  url: z.optional(z.string()),
  area: z.optional(z.string()),
  studyType: z.optional(z.string()),
  startDate: z.optional(iso8601Date),
  endDate: z.optional(iso8601Date),
  score: z.optional(z.string()),
  courses: z.optional(z.array(z.string())),
}).passthrough();

const skillSchema = z.object({
  name: z.optional(z.string()),
  level: z.optional(z.string()),
  keywords: z.optional(z.array(z.string())),
}).passthrough();

const metaSchema = z.object({
  canonical: z.optional(z.string()),
  version: z.optional(z.string()),
  lastModified: z.optional(z.string()),
}).passthrough();

const jsonResumeSchema = z.object({
  $schema: z.optional(z.string()),
  basics: z.optional(basicsSchema),
  work: z.optional(z.array(workSchema)),
  education: z.optional(z.array(educationSchema)),
  skills: z.optional(z.array(skillSchema)),
  meta: z.optional(metaSchema),
}).passthrough();

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Validate a JSON Resume document. Returns validation result with errors. */
export function validateJsonResume(resume: JsonResume): ValidationResult {
  const result = jsonResumeSchema.safeParse(resume);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return { valid: false, errors };
}

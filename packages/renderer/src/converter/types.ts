/**
 * TypeScript types for JSON Resume schema v1.0.0
 * with custom x- extensions for the overlay/merge system.
 *
 * Reference: https://jsonresume.org/schema
 */

export type JsonResumeLocation = {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
};

export type JsonResumeProfile = {
  network?: string;
  username?: string;
  url?: string;
};

export type JsonResumeBasics = {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: JsonResumeLocation;
  profiles?: JsonResumeProfile[];
  "x-visa"?: string;
  "x-phoneLink"?: string;
};

export type JsonResumeWork = {
  "x-id"?: string;
  name?: string;
  location?: string;
  description?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
};

export type JsonResumeEducation = {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
  "x-location"?: string;
};

export type JsonResumeSkill = {
  name?: string;
  level?: string;
  keywords?: string[];
};

export type JsonResumeMeta = {
  canonical?: string;
  version?: string;
  lastModified?: string;
};

export type JsonResume = {
  $schema?: string;
  basics?: JsonResumeBasics;
  work?: JsonResumeWork[];
  education?: JsonResumeEducation[];
  skills?: JsonResumeSkill[];
  meta?: JsonResumeMeta;
  "x-yearsExperience"?: string;
};

/** Shape of a base.yaml file (JSON Resume structure for static career data) */
export type ResumeBase = {
  work?: JsonResumeWork[];
  education?: JsonResumeEducation[];
  skills?: JsonResumeSkill[];
};

/** Shape of a contact.yaml file (maps to JSON Resume basics) */
export type ResumeContact = JsonResumeBasics;

/** Shape of an AI overlay YAML (partial JSON Resume for per-application tailoring) */
export type ResumeOverlay = {
  basics?: Pick<JsonResumeBasics, "label">;
  work?: Array<Pick<JsonResumeWork, "x-id" | "highlights">>;
  skills?: Array<Pick<JsonResumeSkill, "name" | "keywords">>;
};

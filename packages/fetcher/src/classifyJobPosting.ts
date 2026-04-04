export type JobPostingType = "specific-role" | "pipeline";

/**
 * Classifies a job posting as a specific role or a talent pipeline / general call.
 *
 * Heuristics:
 * 1. No requirements-like section heading
 * 2. No specific tech stack keywords in a structured context
 * 3. Job body doesn't reference the title from listing metadata
 */
export function classifyJobPosting(
  title: string,
  markdownBody: string,
): JobPostingType {
  let pipelineSignals = 0;
  let specificSignals = 0;

  const bodyLower = markdownBody.toLowerCase();

  // 1. Check for requirements / qualifications section headings
  const requirementHeadings =
    /^#+\s*(minimum |basic |required |preferred )?(qualifications|requirements|what you('ll)? (need|bring)|must have|skills required)/im;
  if (requirementHeadings.test(markdownBody)) {
    specificSignals += 2;
  } else {
    pipelineSignals += 2;
  }

  // Also check for bold-style section headers (LinkedIn often uses **Heading** instead of ##)
  const boldRequirementHeadings =
    /^\*\*(minimum |basic |required |preferred )?(qualifications|requirements|what you('ll)? (need|bring)|must have|skills required)\*\*/im;
  if (boldRequirementHeadings.test(markdownBody)) {
    specificSignals += 1;
  }

  // 2. Check for specific tech stack mentions in a structured way (lists with technologies)
  const techStackPatterns = [
    /\b(python|java|golang|go|typescript|javascript|rust|c\+\+|ruby|scala|kotlin)\b/i,
    /\b(react|angular|vue|node\.?js|django|flask|spring|rails)\b/i,
    /\b(aws|gcp|azure|kubernetes|docker|terraform|kafka|redis|postgresql|mysql|mongodb)\b/i,
  ];

  const techMentions = techStackPatterns.filter((p) => p.test(bodyLower)).length;
  if (techMentions >= 2) {
    specificSignals += 2;
  } else if (techMentions === 1) {
    specificSignals += 1;
  } else {
    pipelineSignals += 1;
  }

  // 3. Check if body references the job title
  // Normalize title: remove level suffixes like "I", "II", "III", "Senior", "Staff", etc.
  const titleCore = title
    .replace(/\b(senior|staff|principal|lead|junior|intern|i{1,3}|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (titleCore && bodyLower.includes(titleCore)) {
    specificSignals += 1;
  } else {
    pipelineSignals += 1;
  }

  // 4. Check for pipeline-specific language
  const pipelinePhrases = [
    /looking to connect with/i,
    /talent (pipeline|pool|community)/i,
    /general (application|call|interest)/i,
    /want to hear from you/i,
    /join our talent/i,
    /future (roles|opportunities|openings)/i,
  ];

  const pipelinePhraseMatches = pipelinePhrases.filter((p) =>
    p.test(markdownBody),
  ).length;
  if (pipelinePhraseMatches >= 1) {
    pipelineSignals += 2;
  }

  // 5. Check for "Responsibilities" section (specific roles usually have this)
  const responsibilitiesHeading =
    /^#+\s*(key )?(responsibilities|what you('ll)? do|the role|about the role)/im;
  const boldResponsibilitiesHeading =
    /^\*\*(key )?(responsibilities|what you('ll)? do|the role|about the role)\*\*/im;
  if (
    responsibilitiesHeading.test(markdownBody) ||
    boldResponsibilitiesHeading.test(markdownBody)
  ) {
    specificSignals += 1;
  }

  return pipelineSignals > specificSignals ? "pipeline" : "specific-role";
}

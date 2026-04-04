/**
 * Deterministic markdown normalizer for LinkedIn job descriptions.
 *
 * Fixes three classes of formatting artifacts that survive the
 * HTML → Readability → Turndown pipeline:
 *
 * 1. Bold lines that should be headings  (**Section Name** → ## Section Name)
 * 2. Non-standard list markers           (•, ●, –, 1), a) → - or 1.)
 * 3. Inconsistent list indentation        (-   text → - text)
 */

/** Convert standalone bold lines to ## headings. Strips trailing colons. */
export function fixBoldAsHeading(markdown: string): string {
  return markdown.replace(
    /^\*\*([^*\n]+)\*\*:?[ \t]*$/gm,
    (_match, content: string) => `## ${content.replace(/:$/, "").trim()}`,
  );
}

/** Replace non-standard bullet markers with standard markdown `-`. */
export function fixNonStandardListMarkers(markdown: string): string {
  let result = markdown;

  // Unicode bullets → -
  result = result.replace(/^(\s*)[•●►‣⁃◦]\s+/gm, "$1- ");

  // Unicode dashes used as bullets → -
  result = result.replace(/^(\s*)[‐–—]\s+/gm, "$1- ");

  // Parenthesized numbers: 1) → 1.
  result = result.replace(/^(\s*)(\d+)\)\s+/gm, "$1$2. ");

  // Parenthesized letters: a) → -  (no standard markdown equivalent)
  result = result.replace(/^(\s*)[a-zA-Z]\)\s+/gm, "$1- ");

  return result;
}

/** Normalize multi-space indent after list markers to single space. */
export function fixListIndent(markdown: string): string {
  return markdown.replace(/^(\s*-)\s{2,}/gm, "$1 ");
}

/** Run all normalizations in sequence. Best-effort: failures are logged and skipped. */
export function normalizeMarkdown(markdown: string): string {
  const fixes: Array<[string, (md: string) => string]> = [
    ["fixBoldAsHeading", fixBoldAsHeading],
    ["fixNonStandardListMarkers", fixNonStandardListMarkers],
    ["fixListIndent", fixListIndent],
  ];

  let result = markdown;
  for (const [name, fix] of fixes) {
    try {
      result = fix(result);
    } catch (err) {
      console.warn(`[normalize] ${name} failed, skipping: ${err}`);
    }
  }
  return result;
}

import {
  fixBoldAsHeading,
  fixNonStandardListMarkers,
  fixListIndent,
  normalizeMarkdown,
} from "./normalizeMarkdown";

// ─── fixBoldAsHeading ───────────────────────────────────────────────

describe("fixBoldAsHeading", () => {
  it("converts standalone bold line to ## heading", () => {
    expect(fixBoldAsHeading("**About Us**")).toBe("## About Us");
  });

  it("strips trailing colon from heading", () => {
    expect(fixBoldAsHeading("**Key Responsibilities:**")).toBe(
      "## Key Responsibilities",
    );
  });

  it("preserves inline bold mid-sentence", () => {
    const input = "We need someone with **strong Java skills** and experience.";
    expect(fixBoldAsHeading(input)).toBe(input);
  });

  it("preserves bold metadata labels", () => {
    const input = "**Company:** Acme Corp";
    expect(fixBoldAsHeading(input)).toBe(input);
  });

  it("handles multiple bold headings in document", () => {
    const input = [
      "Some intro text.",
      "",
      "**Company Overview**",
      "",
      "We build things.",
      "",
      "**What You'll Do:**",
      "",
      "- Write code",
    ].join("\n");

    const expected = [
      "Some intro text.",
      "",
      "## Company Overview",
      "",
      "We build things.",
      "",
      "## What You'll Do",
      "",
      "- Write code",
    ].join("\n");

    expect(fixBoldAsHeading(input)).toBe(expected);
  });
});

// ─── fixNonStandardListMarkers ──────────────────────────────────────

describe("fixNonStandardListMarkers", () => {
  it("converts bullet • to -", () => {
    expect(fixNonStandardListMarkers("• Design systems")).toBe(
      "- Design systems",
    );
  });

  it("converts bullet ● to -", () => {
    expect(fixNonStandardListMarkers("● Build APIs")).toBe("- Build APIs");
  });

  it("converts dash – to -", () => {
    expect(fixNonStandardListMarkers("– Code reviews")).toBe("- Code reviews");
  });

  it("converts triangle ‣ to -", () => {
    expect(fixNonStandardListMarkers("‣ Mentor juniors")).toBe(
      "- Mentor juniors",
    );
  });

  it("converts numbered 1) to 1.", () => {
    expect(fixNonStandardListMarkers("1) First item")).toBe("1. First item");
  });

  it("converts lettered a) to -", () => {
    expect(fixNonStandardListMarkers("a) Sub-item")).toBe("- Sub-item");
  });

  it("preserves indentation", () => {
    expect(fixNonStandardListMarkers("  • Nested item")).toBe(
      "  - Nested item",
    );
  });

  it("leaves standard - bullets unchanged", () => {
    const input = "- Already standard";
    expect(fixNonStandardListMarkers(input)).toBe(input);
  });

  it("leaves standard 1. lists unchanged", () => {
    const input = "1. Already standard";
    expect(fixNonStandardListMarkers(input)).toBe(input);
  });
});

// ─── fixListIndent ──────────────────────────────────────────────────

describe("fixListIndent", () => {
  it("normalizes triple-space to single-space after -", () => {
    expect(fixListIndent("-   Design systems")).toBe("- Design systems");
  });

  it("leaves single-space unchanged", () => {
    const input = "- Already fine";
    expect(fixListIndent(input)).toBe(input);
  });

  it("preserves leading whitespace for nested items", () => {
    expect(fixListIndent("  -   Nested item")).toBe("  - Nested item");
  });
});

// ─── normalizeMarkdown (integration) ────────────────────────────────

describe("normalizeMarkdown", () => {
  it("normalizes a realistic JD fragment", () => {
    const input = [
      "**Company Overview**",
      "",
      "Acme Corp builds great things.",
      "",
      "**What You'll Do:**",
      "",
      "•   Design scalable systems",
      "●   Build reliable APIs",
      "–   Conduct code reviews",
      "",
      "**Requirements:**",
      "",
      "-   5+ years of experience",
      "-   Strong Java skills",
      "1) Spring Boot",
      "2) Hibernate",
    ].join("\n");

    const expected = [
      "## Company Overview",
      "",
      "Acme Corp builds great things.",
      "",
      "## What You'll Do",
      "",
      "- Design scalable systems",
      "- Build reliable APIs",
      "- Conduct code reviews",
      "",
      "## Requirements",
      "",
      "- 5+ years of experience",
      "- Strong Java skills",
      "1. Spring Boot",
      "2. Hibernate",
    ].join("\n");

    expect(normalizeMarkdown(input)).toBe(expected);
  });

  it("does not mangle already-clean markdown", () => {
    const clean = [
      "## About the Role",
      "",
      "**Company:** Acme Corp",
      "**Location:** Dubai, UAE",
      "",
      "- Write code",
      "- Review code",
      "",
      "1. First requirement",
      "2. Second requirement",
    ].join("\n");

    expect(normalizeMarkdown(clean)).toBe(clean);
  });
});

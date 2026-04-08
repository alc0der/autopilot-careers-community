## /Analyze

Follow these steps to analyze a job description:
1. Read and remember previous resumes
  - Previous resumes are available at `resumes`
1. Create an annotated version of the linted job description:
	- Never change a word from the original.
	- Read `./techniques/jd-normalization.md` if it exists and follow its rules for stripping formatting and marking irrelevant sections. If absent, keep the original formatting intact.
	- Read `./techniques/skill-relevance-annotation.md` if it exists and follow its rules for highlighting and annotating relevant skills. If absent, highlight relevant skills using markdown highlight syntax without inline comments.
	- Never highlight or comment on sections marked as non-relevant.
	- Produce the annotated job description as an artifact.
1. Write the analized resume to `jd-analyzed`
1. Read `./techniques/generic-posting-gate.md` if it exists and follow its rules for flagging vague or generic postings. If absent, proceed without gating.

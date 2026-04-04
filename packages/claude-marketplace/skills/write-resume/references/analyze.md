## /Analyze

Follow these steps to analyze a job description:
1. Read and remember previous resumes
  - Previous resumes are available at `db/resumes`
1. Create an annotated version of the linted job description following these guidelines:
	- Never change a word from the original
	- Remove markdown bold, italic, underline, and strikethrough from the original Job Description
	- Identify relevant sections:
		- Ignore any information under headings about company, its culture, and benefits
		- Replace any irrelevant section or text with `%% non-relevant %%`
	- Highlight relevant skills from my previous CVs by using markdown highlight syntax around words or phrases
	- Write a short comment after each highlight about how my experience relate to the keyword following Obsidian markdown. For example:
		- ... experienced in ==scalling teams==%% scaled team in Beno as Engineering Manager %%
	- Never highlight or comment on `non-relevant` sections
	- Produce the annotated job description as an artifact
1. Write the analized resume to `db/jd-analyzed`
1. Review the annotated result for vague or generic postings:
	- If the ratio of `%% non-relevant %%` sections is very high relative to highlighted content, or if very few highlights were found, flag this to the user:
		- "This JD appears to be a generic talent pipeline posting with few specific requirements. Consider using a generic resume instead of a fully tailored one."
	- Wait for the user to decide whether to continue with a tailored resume or stop
	- **If priority is LOW**: skip this review and proceed automatically
	- **If priority is HIGH**: wait for the user to decide

## /Fetch

Fetch a LinkedIn job description. This reference covers duplicate detection and the fetch procedure.

### Recognizing LinkedIn Input

The user may provide:
- A full LinkedIn URL: `https://www.linkedin.com/jobs/view/1234567890/`
- A shortened URL: `https://lnkd.in/...`
- Just the job ID: `1234567890`

Any other URL format is **not supported**. Tell the user and stop the workflow.

### Duplicate Check

Extract the numeric job ID from the URL (the segment in `/jobs/view/<id>/`). Then, before any network call:

1. Search `job-descriptions/` for a file whose `source` frontmatter value contains the job ID
2. Search `resumes/` for an existing resume matching the company/role

If either search finds a match, announce "Already fetched — <filename>" and skip to [/priority](priority.md). Only proceed to fetching if no local match exists.

### Fetching the Job Description

Use the `mcp__linkedin-fetcher__fetch_job` MCP tool to fetch the job posting:

- By URL: call with `url` parameter
- By job ID: call with `id` parameter

The tool returns markdown content directly, including YAML front matter (containing `rel:source`, `type`, and `tags`) followed by the job title, company, location, job details, and the full description.

### After Fetching

1. Extract the company name and job title from the returned markdown (from the first `#` heading and `**Company:**` line)
2. Determine the `<order>` number by checking existing files in `./job-descriptions/`
3. Write the content to `./job-descriptions/<order>_<company>_<job title>_JD_Raw.md` using the Write tool
4. Proceed to [/priority](priority.md) to determine priority level for this job

## /Fetch

Fetch a LinkedIn job description. This reference covers duplicate detection and the fetch procedure.

### Recognizing LinkedIn Input

The user may provide:
- A full LinkedIn URL: `https://www.linkedin.com/jobs/view/1234567890/`
- A shortened URL: `https://lnkd.in/...`
- Just the job ID: `1234567890`

Any other URL format is **not supported**. Tell the user and stop the workflow.

### Duplicate Check (before fetching)

Extract the numeric job ID from the URL (the segment in `/jobs/view/<id>/`). Then:

1. Search `job-descriptions/` for a file whose `source` frontmatter value contains the job ID
2. Search `resumes/` for an existing resume matching the company/role

Record the results (existing JD path, existing resume path, or neither). Then **always proceed to fetch** — do not skip the fetch even if a local copy exists.

### Paywall / Login-Wall Detection

LinkedIn sometimes returns a stub page (e.g., "Select language" with no job content) instead of the full posting. This happens when LinkedIn requires authentication or rate-limits anonymous access. It is usually transient.

**Detection:** After each fetch, check whether the returned markdown contains an actual job title and description body. If the content is missing or consists only of YAML frontmatter plus a short stub (e.g., "Select language", "Join to view", or fewer than 50 words of body text after the frontmatter), treat it as a **paywall hit**.

**Retry procedure:**

1. Wait **30 seconds** (`sleep 30`), then call `mcp__linkedin-fetcher__fetch_job` again.
2. If the second attempt also returns a stub, wait **60 seconds** and retry once more (3 attempts total).
3. If all 3 attempts return stubs, **then** fall back to asking the user:
   > LinkedIn is gating this posting behind a login wall. After 3 attempts I still couldn't retrieve the full content.
   >
   > You can:
   > 1. **Paste the full JD text** — copy it from your browser
   > 2. **Share a different URL** — company careers page, Indeed, etc.
   > 3. **Wait and retry later** — I'll try fetching again after a longer delay

   If the user chooses option 3, wait **5 minutes** (`sleep 300`) and perform one final fetch attempt. If that also fails, present only options 1 and 2.

### Handling the Fetched Result

After fetching (and passing paywall detection), compare against the duplicate check results:

- **No local JD exists** → write the new file (see [After Fetching](#after-fetching)) and proceed to [/priority](priority.md).
- **Local JD exists — no meaningful changes**: Announce "JD unchanged — `<filename>`". If a rendered resume already exists in `rendered/`, present it to the user and ask:
  > This job was already fetched and a resume was generated. Would you like to regenerate the resume (e.g., after updating your bullet points)?
  - If **yes**: proceed to [/priority](priority.md) using the existing JD
  - If **no**: stop the workflow
- **Local JD exists — changes detected**: Announce "JD updated — showing diff". Show the user a summary of what changed, overwrite the existing `_JD_Raw.md` file with the new content, and proceed to [/priority](priority.md).
- **Only a resume match exists** (no JD file) → write the fetched JD as a new file. The resume will be regenerated.

### Fetching the Job Description

Use the `mcp__linkedin-fetcher__fetch_job` MCP tool to fetch the job posting:

- By URL: call with `url` parameter
- By job ID: call with `id` parameter

The tool returns markdown content directly, including YAML front matter (containing `rel:source`, `type`, and `tags`) followed by the job title, company, location, job details, and the full description.

### After Fetching

**File naming is strict** — files that don't match the pattern break downstream tools.

1. Extract the **company name** and **job title** from the returned markdown (from the first `#` heading and `**Company:**` line)
2. Generate the date prefix as **`YYYYMMDD`** using today's date (e.g., `20260405`). Do **not** use a counter, job ID, or any other prefix.
3. Replace spaces with underscores in company name and job title
4. Write to: `./job-descriptions/YYYYMMDD_<Company>_<Job_Title>_JD_Raw.md`

**Example:** If company is "MENA Discovered" and title is "Senior AI Engineering Manager", today is 2026-04-05 → `20260405_MENA_Discovered_Senior_AI_Engineering_Manager_JD_Raw.md`

5. Proceed to [/priority](priority.md) to determine priority level for this job

## /Priority

After fetching a job description, determine the company priority level.

### Steps

1. Read `priorities.yaml` from the working directory
2. Extract the company name from the fetched JD file (from the filename or the `**Company:**` field)
3. Check if the company name matches any entry in the `high` list (case-insensitive substring match — e.g., "Careem" in config matches "Careem Networks" in JD)
4. If matched: priority is **HIGH**
5. If not matched: use `default_priority` value (defaults to "low")
6. Announce the detected priority to the user:
   - High: "Priority: **HIGH** — Full workflow with interview and review checkpoints"
   - Low: "Priority: **LOW** — Autonomous end-to-end pipeline"

### Fallback

If `priorities.yaml` does not exist, treat all companies as **HIGH** priority (preserving current behavior).

---
allowed-tools: Bash(yq:*) Read Write AskUserQuestion
description: Add achievement to journal
---

<command-name>achievement</command-name>

# Achievement Journal Command

You are helping the user capture a professional achievement in their journal.

## Achievement File

Location: `db/journal/achievements.yaml`

## Workflow

### Step 1: Gather the Achievement

If the user provided text with this command, use that as the initial achievement description. Otherwise, ask:

"What did you accomplish? Describe your achievement - what you did, the impact it had, and any metrics if available."

### Step 2: Review and Refine

Evaluate the achievement text using the STAR method (Situation, Task, Action, Result):

- Does it describe the context/situation?
- Is the action clear and specific?
- Are results quantified where possible?

If the articulation could be stronger, suggest an improved version. For example:

**Original:** "Made the build faster"
**Improved:** "Reduced deployment pipeline from 45 to 8 minutes by parallelizing build steps"

Ask the user if they'd like to use the improved version or keep their original.

Set `reviewed: true` if you suggested improvements and they accepted, otherwise `reviewed: false`.

### Step 3: Ask for Evidence URL (Optional)

"Do you have a link to evidence of this achievement? (PR, doc, dashboard - press Enter to skip)"

### Step 4: Ask for Date

"When did this happen? (YYYY-MM-DD format, press Enter for today: {{current_date}})"

Default to today's date if skipped.

### Step 5: Link to Job (Optional)

Read `db/base.yaml` to check for available job IDs. If jobs exist, ask:

"Would you like to link this to a specific role? Available job IDs: [list them]. (Press Enter to skip)"

### Step 6: Save the Achievement

Use yq to append the new achievement to `db/journal/achievements.yaml`:

```bash
yq -i '.achievements += [{"date": "DATE", "text": "TEXT", "reviewed": REVIEWED}]' db/journal/achievements.yaml
```

Add optional fields only if provided:
- `evidence_url` if user provided a URL
- `job_id` if user selected one

### Step 6b: Embed the Achievement (if `bullet-embeddings` MCP available)

Call `mcp__bullet-embeddings__embed_achievement` with:
- `text`: the achievement text
- `jobId`: the job_id (if provided)
- `date`: the date
- `reviewed`: the reviewed status
- `hasEvidence`: true if evidence_url was provided

This makes the achievement immediately available for groundedness scoring in future resumes.

### Step 7: Confirm

Show the user what was saved and confirm success.

"Achievement captured! Here's what I saved:
- Date: ...
- Achievement: ...
- Evidence: ... (if provided)
- Linked to: ... (if provided)
- Reviewed: ..."

## Important Notes

- Always validate the date format (YYYY-MM-DD)
- Escape special characters in the achievement text for yq (quotes, etc.)
- If the achievements file doesn't exist, create it with the proper header

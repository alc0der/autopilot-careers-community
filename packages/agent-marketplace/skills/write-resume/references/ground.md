## /Ground

Import or re-sync `base.yaml` from a LinkedIn data export.

### When This Runs

- During onboarding, when the user selects the `linkedin-grounding` technique
- On demand, when the user runs `/ground` to re-sync after updating their LinkedIn profile

### Prerequisites

The user must provide a LinkedIn data export containing at least `Positions.csv`. To request one:
1. Go to **Settings > Data Privacy > Get a copy of your data**
2. Select **Positions** (required), and optionally **Profile** and **Education**
3. Click **Request archive**
4. LinkedIn emails a download link within 10 minutes to 2 hours
5. Download and unzip the archive

### Steps

1. **Locate the export.** Ask the user for the path to their LinkedIn export CSVs (the unzipped directory or individual files). Look for `Positions.csv` in the working directory first — the user may have already placed it there.

2. **Read and parse Positions.csv.** Use the Read tool. Expected columns:
   - Company Name, Title, Description, Location
   - Started On (format: "Mon YYYY" or "YYYY"), Finished On (same, or empty for current role)

   If column names differ from expected, match by inspecting the header row — LinkedIn may change naming between export versions.

3. **Optionally read Profile.csv.** If present in the same location, extract:
   - Headline (useful for tagline selection)
   - Summary, Geo Location, Websites

4. **Optionally read Education.csv.** If present, extract:
   - School Name, Degree Name, Start Date, End Date

5. **Apply the promotion limit.** Read the promotion limit from `./techniques/linkedin-grounding.md` (default: 2). Group positions by company name. For each company with more entries than the limit:
   - Sort by start date ascending
   - Keep the N most recent entries (N = promotion limit)
   - Extend the oldest kept entry's start date back to the earliest start date of all entries for that company
   - Present the merge plan to the user for approval before proceeding:
     > **{Company}** has {count} roles. Collapsing to {limit}:
     > - "{oldest kept title}" ({extended start} – {end})
     > - "{newest title}" ({start} – {end})
     >
     > Collapsed roles: {list of removed titles with original dates}

6. **Generate job IDs.** For each position, derive an ID in the format `<company_slug>_<title_slug>`:
   - Company slug: lowercase first word or common abbreviation (e.g., "Beno Technologies" → "beno", "Roamworks" → "roamworks")
   - Title slug: short lowercase key from the title (e.g., "Founding Engineer" → "lead", "Senior Engineering Manager" → "sem")

   **Brownfield (base.yaml exists):** Before generating new IDs:
   - Read the existing `base.yaml`
   - Match CSV positions to existing entries by company name + title + date overlap
   - **Preserve existing IDs** for matched positions (critical for render compatibility with existing AI YAMLs)
   - Only generate new IDs for genuinely new positions
   - Present the full ID mapping to the user for confirmation

7. **Handle brownfield merge.** If `base.yaml` already exists:
   - Snapshot the current file to `base-history/base.<today's date>.yaml` (create the directory if needed)
   - Preserve the `education` section from existing base.yaml (unless Education.csv is present and user wants to update it)
   - Preserve the `skills` section from existing base.yaml
   - If any existing base.yaml entries have no match in the LinkedIn export, flag them:
     > These work entries are in base.yaml but not in your LinkedIn export:
     > - {x-id}: {position} at {name}
     >
     > **Keep** or **remove** them?

8. **Handle greenfield.** If no `base.yaml` exists:
   - Generate all IDs fresh (per step 6)
   - If Education.csv is present, populate the `education` section
   - If no Education.csv, create an empty `education` section for the user to fill manually
   - Create `skills` with standard categories:
     ```yaml
     skills:
       - name: Technical
         keywords: []
       - name: Managerial
         keywords: []
     ```

9. **Convert dates.** Transform LinkedIn date formats to JSON Resume ISO 8601 partial dates:
   - "Jan 2020" → "2020-01"
   - "2020" → "2020"
   - Empty / current → omit `endDate` field

10. **Write base.yaml.** Present the proposed base.yaml to the user for review. After approval, write it to the working directory.

11. **Write or update the technique file.** Write `./techniques/linkedin-grounding.md` with the filled-in config:
    - LinkedIn URL (from contact.yaml's linkedin field, or ask the user)
    - Strictness level (from onboarding choice or existing technique file)
    - Promotion limit (as configured)
    - Last sync date (today)

12. **Confirm** to the user:
    > base.yaml grounded from LinkedIn export.
    > - {N} positions imported ({M} after promotion limit)
    > - Strictness: {level}
    > - Snapshot saved to `base-history/base.{date}.yaml`

### Return

Return control to the calling workflow (onboarding continues, or the user's original task resumes).

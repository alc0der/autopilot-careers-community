## /Onboard

First-time setup: select and customize resume techniques.

### When This Runs

This flow runs when `./techniques/` does not exist or contains no `.md` files. It can also be triggered manually for re-configuration.

### Steps

1. Create the `./techniques/` directory if it doesn't exist:
   ```sh
   mkdir -p techniques
   ```

2. Read all `.md` files from the technique library at `<skill-base-dir>/techniques-library/`. For each file, note the frontmatter fields: `name`, `summary`, `category`, `conflicts-with`, `default`.

3. **Fast path.** Before presenting individual techniques, offer the user a shortcut:

   > I need to set up your resume writing preferences (one-time).
   > There are 10 techniques covering data source, layout, content, and workflow.
   >
   > **A)** Use all recommended defaults (fastest — you can tweak later)
   > **B)** Walk me through them so I can pick

   If the user picks **A**, skip to step 6 using all `default: true` techniques with their default values. Then proceed to step 3b (linkedin-grounding is `default: false` and always asked explicitly).

3b. **Round 0 — Data Source.** Present linkedin-grounding as a standalone choice (regardless of whether fast path was chosen):

   > **linkedin-grounding** — Ground your `base.yaml` from a LinkedIn data export. Controls how strictly resumes follow your LinkedIn profile (titles, dates, job structure) and limits promotions shown per company.
   >
   > Requires a LinkedIn data export: Settings > Data Privacy > Get a copy of your data > select **Positions** (and optionally Profile, Education). Takes ~10min to 2hrs for LinkedIn to email the download link.
   >
   > **A)** Set up LinkedIn grounding &nbsp; **B)** Skip (maintain base.yaml manually)

   If the user picks **A**: ask for strictness preference (strict / moderate / loose, default: strict), then run [/ground](references/ground.md) inline. After grounding completes, continue to step 4 (or step 6 if fast path).

   If the user picks **B**: continue without the technique.

4. **Pairwise selection.** Present techniques two at a time, grouped by category. For each pair, give the user three (or four) clear choices. Wait for a response before presenting the next pair.

   The pairs, in order:

   **Round 1 — Layout**
   > **page-layout** — One-page resume with graduated bullet counts and a trim cascade when content overflows
   > **skill-logo-limit** — Limit the number of technology logos in the skills section (default: 2-5)
   >
   > **A)** Both &nbsp; **B)** page-layout only &nbsp; **C)** skill-logo-limit only &nbsp; **D)** Neither

   **Round 2 — Content (career story)**
   > **career-narrative** — Construct a coherent EM vs IC career progression; guard against implied demotions
   > **dual-tagline** — Restrict the resume tagline to a predefined set of options
   >
   > **A)** Both &nbsp; **B)** career-narrative only &nbsp; **C)** dual-tagline only &nbsp; **D)** Neither

   **Round 3 — Content (title control)**

   If linkedin-grounding was selected in Round 0, **skip this round** and inform the user:
   > Skipping title control techniques — **job-title-lock** and **allowed-title-whitelist** are superseded by **linkedin-grounding** (strict mode locks titles to your LinkedIn profile).

   If linkedin-grounding was NOT selected, present normally with a deprecation note:
   > **job-title-lock** — Prevent changing job titles without your explicit approval *(deprecated — consider linkedin-grounding)*
   > **allowed-title-whitelist** — Restrict the most recent role's title to a pre-approved list *(deprecated — consider linkedin-grounding)*
   >
   > **A)** Both &nbsp; **B)** job-title-lock only &nbsp; **C)** allowed-title-whitelist only &nbsp; **D)** Neither

   **Round 4 — Workflow (JD analysis)**
   > **jd-normalization** — Strip markdown formatting and replace irrelevant JD sections with markers
   > **skill-relevance-annotation** — Highlight relevant skills in JDs and annotate with experience context
   >
   > **A)** Both &nbsp; **B)** jd-normalization only &nbsp; **C)** skill-relevance-annotation only &nbsp; **D)** Neither

   **Round 5 — Workflow (quality gate)**
   > **generic-posting-gate** — Flag vague or generic JDs and suggest using a generic resume instead
   >
   > **A)** Include &nbsp; **B)** Skip

5. **Conflict detection.** After all rounds, check the `conflicts-with` field of every selected technique. If any pair conflicts, warn the user and ask which to keep:
   > "**{technique-a}** conflicts with **{technique-b}**. Which would you like to keep?"

6. **Generate user technique files.** For each selected technique:
   - Read its "Instructions" section from the library template
   - Replace all `{{placeholders}}` with default values (the defaults are listed below)
   - Write the result as **plain markdown** (no frontmatter, no onboarding prompt) to `./techniques/<name>.md`
   - The file should start with a heading (`# Technique Name`) followed by the concrete instructions

   **Default values:**
   - page-layout: 1 page, graduated bullets (5, 4, 3, 2), oldest may be omitted
   - career-narrative: EM vs IC focus, demotion guard on
   - dual-tagline: "EM | Founding Eng." (people-focused), "Sr. Eng. Manager" (technical)
   - skill-logo-limit: 2-5 logos
   - job-title-lock: locked, require approval
   - allowed-title-whitelist: Senior Engineering Manager, Senior Technical Lead, Solutions Architect, Technical Program Manager, Senior Full Stack Engineer, Senior Backend Engineer, Senior Frontend Engineer
   - jd-normalization: strip formatting, replace irrelevant with %% non-relevant %%
   - skill-relevance-annotation: highlight + comment with company context
   - generic-posting-gate: flag vague JDs, auto-proceed for LOW priority
   - linkedin-grounding: strictness strict, promotion_limit 2, linkedin_url from contact.yaml, last_sync_date today

7. **Confirm** to the user:
   > Techniques configured! Created X files in `./techniques/`.
   > You can edit these anytime — they're plain markdown.
   > To reconfigure, delete the `./techniques/` folder or run `/onboard` again.

8. **Return** control to the calling workflow (resume generation continues from where it left off).

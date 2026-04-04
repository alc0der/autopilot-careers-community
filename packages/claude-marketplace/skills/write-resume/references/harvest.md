### /Harvest

Indexes AI-generated bullets from resume YAML files into the embeddings system for trust analysis.

#### Usage

- `/harvest <file>` — harvest a specific AI YAML file
- `/harvest --all` — harvest all `*_ai.yaml` files in `db/resumes/`

#### Steps

1. Verify the `bullet-embeddings` MCP server is available
2. If a specific file is given, call `mcp__bullet-embeddings__harvest` with the absolute path
3. If `--all`, scan `db/resumes/` for `*_ai.yaml` files and harvest each one
4. Report summary: how many bullets harvested, new vs updated

#### What Happens

For each bullet in the AI YAML:
- The text is embedded via Ollama (nomic-embed-text)
- The nearest achievement is found and its distance recorded
- The bullet is stored in the vector index with metadata (job_id, resume file, date, etc.)
- If the bullet already exists (same resume + job + index), it's updated

#### When to Use

- After generating a resume (automatically called in step 9 of `/execute`)
- To backfill existing resumes into the embeddings system
- After modifying an AI YAML file manually

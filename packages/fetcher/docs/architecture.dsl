# Component model for the linkedin-fetcher container.
# Included by docs/model.dsl — do NOT wrap in workspace { }.

# ── Components ────────────────────────────────────────────────
mcpServer = component "MCP Server" {
    description "Exposes fetch_job tool over stdio; returns Markdown or RateLimitError"
    technology "@modelcontextprotocol/sdk, Zod"
}

corePipeline = component "Core Pipeline" {
    description "Orchestrates resolve → fetch → extract → convert → normalize → classify"
    technology "TypeScript"
}

fetcherRouter = component "Fetcher Router" {
    description "Selects LinkedIn API (default) or Puppeteer; propagates RateLimitError, falls back to Puppeteer for other failures"
    technology "TypeScript"
}

apiFetcher = component "LinkedIn API Fetcher" {
    description "Calls jobs-guest public API, parses HTML with Cheerio, detects rate limits"
    technology "Cheerio"
}

puppeteerFetcher = component "Puppeteer Fetcher" {
    description "Headless browser with stealth plugin for non-API and fallback fetches"
    technology "puppeteer-extra, puppeteer-extra-plugin-stealth"
}

readabilityExtractor = component "Readability Extractor" {
    description "Extracts article content from raw HTML"
    technology "@mozilla/readability, JSDOM"
}

htmlToMarkdown = component "HTML-to-Markdown" {
    description "Converts article HTML to Markdown, strips spans and inline breaks"
    technology "Turndown"
}

markdownNormalizer = component "Markdown Normalizer" {
    description "Fixes bold-as-heading, non-standard list markers, and indentation"
    technology "TypeScript"
}

jobClassifier = component "Job Classifier" {
    description "Heuristic scorer: specific-role vs pipeline posting"
    technology "TypeScript"
}

# ── Relationships ─────────────────────────────────────────────
mcpServer          -> corePipeline         "delegates to"
corePipeline       -> fetcherRouter        "fetch HTML"
fetcherRouter      -> apiFetcher           "LinkedIn URLs (default)"
fetcherRouter      -> puppeteerFetcher     "non-LinkedIn or API fallback"
corePipeline       -> readabilityExtractor "extract article"
readabilityExtractor -> htmlToMarkdown     "article HTML"
corePipeline       -> markdownNormalizer   "normalize"
corePipeline       -> jobClassifier        "classify posting type"

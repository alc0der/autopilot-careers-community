/**
 * Embedding model eval: measures cosine similarity on tech-domain term pairs
 * to check whether the model understands domain relationships.
 *
 * Usage:
 *   npx tsx src/eval-embeddings.ts [model1] [model2] ...
 *
 * Defaults to nomic-embed-text if no models are specified.
 * Requires Ollama running locally with the models already pulled.
 */

import { Ollama } from "ollama";

// ── Eval pairs ──────────────────────────────────────────────────────────────
// Each pair has two terms and an expected similarity bucket.
//   "high"   = should be semantically close  (same domain / interchangeable tools)
//   "low"    = should be distant              (same word, different domain)
//   "medium" = related but not interchangeable

interface EvalPair {
  a: string;
  b: string;
  expected: "high" | "medium" | "low";
  note?: string;
}

const EVAL_PAIRS: EvalPair[] = [
  // ── Issue tracking / project management ──
  { a: "Linear",                   b: "Jira",                    expected: "high",   note: "issue trackers" },
  { a: "Linear issue tracking",    b: "Jira project management", expected: "high",   note: "issue trackers with context" },
  { a: "Linear",                   b: "linear algebra",          expected: "low",    note: "ambiguous term" },

  // ── Observability ──
  { a: "Grafana",                  b: "Datadog",                 expected: "high",   note: "observability platforms" },
  { a: "Prometheus",               b: "New Relic",               expected: "high",   note: "monitoring" },
  { a: "ELK stack",                b: "Splunk",                  expected: "high",   note: "log aggregation" },

  // ── Container orchestration ──
  { a: "Kubernetes",               b: "Docker Swarm",            expected: "high",   note: "container orchestration" },
  { a: "Kubernetes",               b: "Terraform",               expected: "medium", note: "infra but different concerns" },

  // ── CI/CD ──
  { a: "GitHub Actions",           b: "Jenkins",                 expected: "high",   note: "CI/CD" },
  { a: "CircleCI",                 b: "GitLab CI",               expected: "high",   note: "CI/CD" },
  { a: "ArgoCD",                   b: "Flux",                    expected: "high",   note: "GitOps CD" },

  // ── Messaging / streaming ──
  { a: "Kafka",                    b: "RabbitMQ",                expected: "high",   note: "message brokers" },
  { a: "Kafka",                    b: "Franz Kafka",             expected: "low",    note: "ambiguous term" },

  // ── Frontend frameworks ──
  { a: "React",                    b: "Angular",                 expected: "high",   note: "frontend frameworks" },
  { a: "Vue.js",                   b: "Svelte",                  expected: "high",   note: "frontend frameworks" },
  { a: "React",                    b: "nuclear reaction",        expected: "low",    note: "ambiguous term" },

  // ── Databases ──
  { a: "PostgreSQL",               b: "MySQL",                   expected: "high",   note: "relational DBs" },
  { a: "MongoDB",                  b: "DynamoDB",                expected: "high",   note: "NoSQL DBs" },
  { a: "Redis",                    b: "Memcached",               expected: "high",   note: "caching" },
  { a: "PostgreSQL",               b: "MongoDB",                 expected: "medium", note: "both DBs, different paradigm" },

  // ── Cloud providers ──
  { a: "AWS Lambda",               b: "Google Cloud Functions",  expected: "high",   note: "serverless" },
  { a: "AWS S3",                   b: "Google Cloud Storage",    expected: "high",   note: "object storage" },

  // ── Languages ──
  { a: "TypeScript",               b: "JavaScript",              expected: "high",   note: "same ecosystem" },
  { a: "Go",                       b: "Rust",                    expected: "medium", note: "systems languages" },
  { a: "Go",                       b: "board game Go",           expected: "low",    note: "ambiguous term" },
  { a: "Python",                   b: "python snake",            expected: "low",    note: "ambiguous term" },

  // ── Resume bullet context ──
  { a: "Led migration from monolith to microservices",
    b: "Decomposed monolithic application into distributed services",
    expected: "high", note: "same achievement, different wording" },
  { a: "Reduced API latency by 40% through caching",
    b: "Improved response times with Redis caching layer",
    expected: "high", note: "same achievement, different wording" },
  { a: "Built CI/CD pipeline with GitHub Actions",
    b: "Managed Kubernetes cluster on AWS EKS",
    expected: "medium", note: "both DevOps, different focus" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function embedPair(
  ollama: Ollama,
  model: string,
  a: string,
  b: string
): Promise<number> {
  const res = await ollama.embed({ model, input: [a, b] });
  return cosine(res.embeddings[0], res.embeddings[1]);
}

// ── Thresholds for grading ──────────────────────────────────────────────────
// These are tunable — adjust based on what you observe.
const THRESHOLDS = {
  high:   { min: 0.65 },   // similar terms should score above this
  low:    { max: 0.45 },   // unrelated terms should score below this
  medium: { min: 0.40, max: 0.75 }, // related-but-different
};

function grade(similarity: number, expected: "high" | "medium" | "low"): "PASS" | "FAIL" | "WARN" {
  switch (expected) {
    case "high":
      return similarity >= THRESHOLDS.high.min ? "PASS" : "FAIL";
    case "low":
      return similarity <= THRESHOLDS.low.max ? "PASS" : "FAIL";
    case "medium":
      if (similarity >= THRESHOLDS.medium.min && similarity <= THRESHOLDS.medium.max) return "PASS";
      // Allow some slack for medium — warn rather than fail if close
      if (similarity >= THRESHOLDS.medium.min - 0.1 && similarity <= THRESHOLDS.medium.max + 0.1) return "WARN";
      return "FAIL";
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function evalModel(model: string) {
  const ollama = new Ollama();

  console.log(`\n${"=".repeat(70)}`);
  console.log(`MODEL: ${model}`);
  console.log(`${"=".repeat(70)}\n`);

  // Warm up / verify model exists
  try {
    await ollama.embed({ model, input: "test" });
  } catch (err) {
    console.error(`  ERROR: could not reach model "${model}". Is it pulled?\n  ${err}`);
    return { model, pass: 0, warn: 0, fail: 0, total: 0 };
  }

  let pass = 0, warn = 0, fail = 0;
  const results: string[] = [];

  for (const pair of EVAL_PAIRS) {
    const sim = await embedPair(ollama, model, pair.a, pair.b);
    const result = grade(sim, pair.expected);

    if (result === "PASS") pass++;
    else if (result === "WARN") warn++;
    else fail++;

    const icon = result === "PASS" ? "✓" : result === "WARN" ? "~" : "✗";
    const line = `  ${icon} ${result.padEnd(4)} sim=${sim.toFixed(3)}  expected=${pair.expected.padEnd(6)}  "${pair.a}" ↔ "${pair.b}"${pair.note ? `  (${pair.note})` : ""}`;
    results.push(line);
  }

  // Print results grouped by outcome
  const failures = results.filter(r => r.includes("✗ FAIL"));
  const warnings = results.filter(r => r.includes("~ WARN"));
  const passes = results.filter(r => r.includes("✓ PASS"));

  if (failures.length) {
    console.log("FAILURES:");
    failures.forEach(r => console.log(r));
    console.log();
  }
  if (warnings.length) {
    console.log("WARNINGS:");
    warnings.forEach(r => console.log(r));
    console.log();
  }
  console.log("PASSES:");
  passes.forEach(r => console.log(r));

  const total = EVAL_PAIRS.length;
  console.log(`\nSCORE: ${pass}/${total} pass, ${warn} warn, ${fail} fail`);

  return { model, pass, warn, fail, total };
}

async function main() {
  const models = process.argv.slice(2);
  if (models.length === 0) {
    models.push("nomic-embed-text");
  }

  const scores = [];
  for (const model of models) {
    scores.push(await evalModel(model));
  }

  if (scores.length > 1) {
    console.log(`\n${"=".repeat(70)}`);
    console.log("COMPARISON SUMMARY");
    console.log(`${"=".repeat(70)}`);
    for (const s of scores) {
      console.log(`  ${s.model.padEnd(30)} ${s.pass}/${s.total} pass, ${s.warn} warn, ${s.fail} fail`);
    }
  }
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * E2E test: spawns the MCP server over stdio and calls render_resume
 * in both local (file-path) and remote (inline-content) modes.
 *
 * Usage:  node test/e2e-render.mjs
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, "../bundle/oh-my-cv-render-mcp.js");

// ── Test fixtures ──────────────────────────────────────────────────
const LOCAL_TOOL_ARGS = {
  input:
    "/Users/alc0der/code/alc0der/thate-db/db/rendered/20260402_Sully.ai_Head_of_Engineering_UAE_Resume.md",
  output: "/tmp/20260402_Sully.ai_Head_of_Engineering_UAE_Resume.pdf",
  metadata: {
    title: "Ahmad Akilan — Sully.ai Head of Engineering UAE",
    author: "Ahmad Akilan",
    subject: "Tailored for: Sully.ai — Head of Engineering, UAE",
    keywords: ["Sully.ai", "Head of Engineering"],
  },
};

const INLINE_MARKDOWN = `---
name: Test User <br><small>Software Engineer</small>
header:
  - text: "test@example.com"
    link: "mailto:test@example.com"
---

## Work Experience <span>5+ years</span>

**Software Engineer** | Acme Corp
  ~ San Francisco, CA | 01/2020 - Present

- Built scalable microservices handling 10M requests/day
- Led migration from monolith to event-driven architecture

## Education

**University of California**
  ~ Berkeley, CA

B.S. in Computer Science
  ~ 2016 - 2020

## Skills

**Technical:** Python, TypeScript, AWS
`;

const INLINE_TOOL_ARGS = {
  input: INLINE_MARKDOWN,
  filename: "test_inline_resume",
  metadata: {
    title: "Test User — Software Engineer",
    author: "Test User",
  },
};

// ── JSON-RPC helpers ───────────────────────────────────────────────
function rpc(method, params = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params });
}

// ── Test runner ────────────────────────────────────────────────────
const tests = [
  { name: "local mode", args: LOCAL_TOOL_ARGS },
  { name: "inline mode", args: INLINE_TOOL_ARGS },
];

let currentTest = 0;
let initialized = false;

const child = spawn("node", [SERVER], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();

  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;

    const msg = JSON.parse(line);

    // After initialize response → send initialized + first test
    if (msg.result?.serverInfo && !initialized) {
      initialized = true;
      send(rpc("notifications/initialized"));
      console.log(`\n--- Test: ${tests[currentTest].name} ---`);
      send(
        rpc("tools/call", {
          name: "render_resume",
          arguments: tests[currentTest].args,
        })
      );
      return;
    }

    // Tool call response
    if (msg.result?.content) {
      const content = msg.result.content[0];

      if (msg.result.isError) {
        console.error(`FAIL [${tests[currentTest].name}]:`, content.text);
        process.exit(1);
      }

      if (tests[currentTest].name === "local mode") {
        // Local mode: expect text content with JSON
        if (content.type !== "text") {
          console.error(`FAIL [local mode]: expected text content, got ${content.type}`);
          process.exit(1);
        }
        const result = JSON.parse(content.text);
        console.log("OK:", result);
        if (result.pageCount < 1) {
          console.error("FAIL: pageCount < 1");
          process.exit(1);
        }
      } else {
        // Inline mode: expect resource content with blob
        if (content.type !== "resource") {
          console.error(`FAIL [inline mode]: expected resource content, got ${content.type}`);
          process.exit(1);
        }
        const resource = content.resource;
        if (!resource.blob) {
          console.error("FAIL [inline mode]: missing blob in resource");
          process.exit(1);
        }
        if (resource.mimeType !== "application/pdf") {
          console.error(`FAIL [inline mode]: expected application/pdf, got ${resource.mimeType}`);
          process.exit(1);
        }
        const pdfBytes = Buffer.from(resource.blob, "base64");
        console.log(`OK: ${resource.uri} (${pdfBytes.length} bytes)`);
        if (pdfBytes.length < 100) {
          console.error("FAIL [inline mode]: PDF too small");
          process.exit(1);
        }
      }

      // Move to next test or finish
      currentTest++;
      if (currentTest < tests.length) {
        console.log(`\n--- Test: ${tests[currentTest].name} ---`);
        send(
          rpc("tools/call", {
            name: "render_resume",
            arguments: tests[currentTest].args,
          })
        );
      } else {
        console.log("\nAll tests passed.");
        child.kill();
        process.exit(0);
      }
    }
  }
});

function send(json) {
  child.stdin.write(json + "\n");
}

// Kick off with initialize
send(
  rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "e2e-test", version: "0.0.1" },
  })
);

// Safety timeout
setTimeout(() => {
  console.error("FAIL: timed out after 60s");
  child.kill();
  process.exit(1);
}, 60_000);

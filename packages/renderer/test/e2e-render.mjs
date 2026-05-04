#!/usr/bin/env node
/**
 * E2E test: spawns the MCP server over stdio and calls render_resume
 * with inline markdown content.
 *
 * Usage:  node test/e2e-render.mjs
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, "../bundle/oh-my-cv-render-mcp.js");

const INLINE_MARKDOWN = `---
name: Test User <br><small>Software Engineer</small>
header:
  - text: ":tabler--phone: +1 234 567 890"
    link: "tel:+12345678901"
  - text: ":tabler--mail: test@example.com"
    link: "mailto:test@example.com"
---

## Work Experience <span>5+ years</span>

**Software Engineer** | Acme Corp
  ~ San Francisco, CA | 01/2020 - Present

- Built scalable microservices on :devicon--java: Java handling 10M requests/day
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

    // After initialize response → send initialized + render
    if (msg.result?.serverInfo && !initialized) {
      initialized = true;
      send(rpc("notifications/initialized"));
      console.log(`\n--- Test: inline render ---`);
      send(
        rpc("tools/call", {
          name: "render_resume",
          arguments: INLINE_TOOL_ARGS,
        })
      );
      return;
    }

    // Tool call response
    if (msg.result?.content) {
      if (msg.result.isError) {
        const errorBlock = msg.result.content.find((c) => c.type === "text");
        console.error("FAIL:", errorBlock?.text ?? "(unknown error)");
        process.exit(1);
      }

      const resourceBlock = msg.result.content.find((c) => c.type === "resource");
      const textBlock = msg.result.content.find((c) => c.type === "text");

      if (!resourceBlock) {
        console.error("FAIL: missing resource content block");
        process.exit(1);
      }
      const resource = resourceBlock.resource;
      if (!resource.blob) {
        console.error("FAIL: missing blob in resource");
        process.exit(1);
      }
      if (resource.mimeType !== "application/pdf") {
        console.error(`FAIL: expected application/pdf, got ${resource.mimeType}`);
        process.exit(1);
      }
      const pdfBytes = Buffer.from(resource.blob, "base64");
      console.log(`OK: ${resource.uri} (${pdfBytes.length} bytes)`);
      if (pdfBytes.length < 100) {
        console.error("FAIL: PDF too small");
        process.exit(1);
      }

      if (!textBlock) {
        console.error("FAIL: missing pageCount text block");
        process.exit(1);
      }
      const meta = JSON.parse(textBlock.text);
      if (typeof meta.pageCount !== "number" || meta.pageCount < 1) {
        console.error(`FAIL: invalid pageCount ${meta.pageCount}`);
        process.exit(1);
      }
      console.log(`OK: pageCount=${meta.pageCount}`);

      console.log("\nAll tests passed.");
      child.kill();
      process.exit(0);
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

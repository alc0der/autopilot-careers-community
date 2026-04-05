#!/usr/bin/env node
/**
 * E2E test: spawns the MCP server over stdio and calls render_resume.
 *
 * Usage:  node test/e2e-render.mjs
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, "../bundle/oh-my-cv-render-mcp.js");

// ── Test fixture ────────────────────────────────────────────────────
const TOOL_ARGS = {
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

// ── JSON-RPC helpers ────────────────────────────────────────────────
function rpc(method, params = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params });
}

// ── Main ────────────────────────────────────────────────────────────
const child = spawn("node", [SERVER], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();

  // MCP uses newline-delimited JSON-RPC
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;

    const msg = JSON.parse(line);

    // After initialize response → send initialized + call tool
    if (msg.result?.serverInfo) {
      send(rpc("notifications/initialized"));
      send(
        rpc("tools/call", {
          name: "render_resume",
          arguments: TOOL_ARGS,
        })
      );
      return;
    }

    // Tool call response
    if (msg.result?.content) {
      const text = msg.result.content[0]?.text;
      if (msg.result.isError) {
        console.error("FAIL:", text);
        process.exit(1);
      }
      const result = JSON.parse(text);
      console.log("OK:", result);
      if (result.pageCount < 1) {
        console.error("FAIL: pageCount < 1");
        process.exit(1);
      }
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
  console.error("FAIL: timed out after 30s");
  child.kill();
  process.exit(1);
}, 30_000);

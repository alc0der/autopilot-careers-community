#!/usr/bin/env python3
"""Extract readable conversation transcripts from Claude session audit logs.

Modes:
    transcript  Show the conversation from a single session (default)
    summary     Quick metadata: title, model, date, message counts
    search      Find sessions matching a pattern across all sessions

Examples:
    python extract.py local_064790ae-...                    # full transcript
    python extract.py --summary local_064790ae-...          # quick summary
    python extract.py --search "paywall" --sessions-dir .claude-sessions
    python extract.py --search "fetch" local_064790ae-...   # search within session
"""

import json
import sys
import re
import argparse
from pathlib import Path
from datetime import datetime


# ---------------------------------------------------------------------------
# Discovery helpers
# ---------------------------------------------------------------------------

def find_sessions_dir(start_path=None):
    """Walk up from *start_path* (or cwd) looking for .claude-sessions/."""
    roots = []
    if start_path:
        roots.append(Path(start_path))
    roots.append(Path.cwd())
    for root in roots:
        for p in [root] + list(root.parents):
            candidate = p / ".claude-sessions"
            if candidate.is_dir():
                return candidate
    return None


def resolve_session(session_input, sessions_dir=None):
    """Return (metadata_json_path | None, audit_jsonl_path | None)."""
    p = Path(session_input)

    # Direct path to audit.jsonl
    if p.name == "audit.jsonl" and p.exists():
        meta = p.parent.with_suffix(".json")
        return (meta if meta.exists() else None), p

    # Path to session directory
    if p.is_dir() and (p / "audit.jsonl").exists():
        meta = p.with_suffix(".json")
        return (meta if meta.exists() else None), p / "audit.jsonl"

    # Bare session ID — resolve inside sessions_dir
    if sessions_dir is None:
        sessions_dir = find_sessions_dir()
    if sessions_dir:
        sid = session_input
        for prefix in ("", "local_"):
            cid = f"{prefix}{sid}" if not sid.startswith(prefix) else sid
            audit = sessions_dir / cid / "audit.jsonl"
            meta = sessions_dir / f"{cid}.json"
            if audit.exists():
                return (meta if meta.exists() else None), audit

    return None, None


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def truncate(text, max_len=300):
    if not text or len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def format_block(block, max_result=300, max_input=200):
    """Turn one content block into a human-readable string."""
    if isinstance(block, str):
        return block
    if not isinstance(block, dict):
        return str(block)

    btype = block.get("type", "")

    if btype == "thinking":
        thought = block.get("thinking", "")
        return f"[THINKING: {truncate(thought, max_result)}]"

    if btype == "text":
        return block.get("text", "")

    if btype == "tool_use":
        name = block.get("name", "?")
        inp = block.get("input", {})
        parts = [f"{k}={truncate(str(v), max_input)}" for k, v in inp.items()]
        return f"[TOOL: {name}({', '.join(parts)})]"

    if btype == "tool_result":
        content = block.get("content", "")
        if isinstance(content, list):
            texts = []
            for cb in content:
                if isinstance(cb, dict) and cb.get("type") == "text":
                    texts.append(cb["text"])
                elif isinstance(cb, str):
                    texts.append(cb)
            content = "\n".join(texts)
        content = str(content)
        # Collapse <persisted-output> wrappers
        if "<persisted-output>" in content:
            m = re.search(
                r"Preview \(first[^)]*\):\s*(.*?)(?:\.\.\.|</persisted-output>)",
                content,
                re.DOTALL,
            )
            if m:
                content = f"[PERSISTED] {m.group(1).strip()}"
            else:
                content = "[PERSISTED OUTPUT — content saved to file]"
        return f"[RESULT: {truncate(content, max_result)}]"

    if btype == "image":
        return "[IMAGE]"

    return f"[{btype}: {truncate(str(block), 100)}]"


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

SKIP_SUBTYPES = frozenset((
    "init",
    "permission_request",
    "permission_response",
    "mcp_tool_result",
))


def extract_messages(audit_path, search_pattern=None, max_result=300, compact=False):
    """Yield (line_num, role, formatted_text) for conversation turns."""
    pat = re.compile(search_pattern, re.IGNORECASE) if search_pattern else None
    max_text = 500 if compact else 0  # 0 = unlimited

    with open(audit_path) as fh:
        for lineno, raw in enumerate(fh, 1):
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            mtype = data.get("type", "")
            msub = data.get("subtype", "")

            if mtype == "system" and msub in SKIP_SUBTYPES:
                continue
            if mtype not in ("user", "assistant"):
                continue

            content = data.get("message", data).get("content", [])
            if isinstance(content, str):
                content = [{"type": "text", "text": content}]

            parts = [
                fmt
                for block in content
                if (fmt := format_block(block, max_result=max_result)) and fmt.strip()
            ]
            if not parts:
                continue

            text = "\n".join(parts)
            if max_text and len(text) > max_text:
                text = text[:max_text] + f"\n... [truncated, {len(text)} chars total]"

            if pat and not pat.search(text):
                continue

            yield lineno, mtype, text


# ---------------------------------------------------------------------------
# Output modes
# ---------------------------------------------------------------------------

def print_transcript(audit_path, search_pattern=None, max_result=300, compact=False):
    for lineno, role, text in extract_messages(audit_path, search_pattern, max_result, compact):
        label = "USER" if role == "user" else "ASST"
        print(f"\n--- L{lineno} [{label}] ---")
        print(text)


def read_metadata(path):
    if path and Path(path).exists():
        with open(path) as f:
            return json.load(f)
    return {}


def print_summary(meta_path, audit_path):
    meta = read_metadata(meta_path)
    title = meta.get("title", "(untitled)")
    model = meta.get("model", "(unknown)")
    initial = meta.get("initialMessage", "")
    created = meta.get("createdAt")
    last = meta.get("lastActivityAt")

    fmt = lambda ts: datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M") if ts else "(unknown)"

    user_n = asst_n = tool_n = 0
    if audit_path and Path(audit_path).exists():
        with open(audit_path) as fh:
            for raw in fh:
                try:
                    d = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                t = d.get("type", "")
                if t == "user":
                    user_n += 1
                elif t == "assistant":
                    asst_n += 1
                    content = d.get("message", d).get("content", [])
                    if isinstance(content, list):
                        tool_n += sum(
                            1 for b in content
                            if isinstance(b, dict) and b.get("type") == "tool_use"
                        )

    print(f"Title:    {title}")
    print(f"Model:    {model}")
    print(f"Created:  {fmt(created)}")
    print(f"Last:     {fmt(last)}")
    print(f"Initial:  {truncate(initial, 200)}")
    print(f"Messages: {user_n} user, {asst_n} assistant ({tool_n} tool calls)")


def search_all_sessions(sessions_dir, pattern, limit=10):
    sd = Path(sessions_dir)
    skip = {"spaces.json", "cowork_settings.json", ".claude.json"}
    results = []

    for meta_file in sorted(sd.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        if meta_file.name in skip or meta_file.name.startswith("."):
            continue
        sid = meta_file.stem
        audit = sd / sid / "audit.jsonl"
        if not audit.exists():
            continue

        matches = list(extract_messages(audit, search_pattern=pattern, max_result=150))
        if matches:
            meta = read_metadata(meta_file)
            results.append({
                "session_id": sid,
                "title": meta.get("title", "(untitled)"),
                "model": meta.get("model", ""),
                "created": meta.get("createdAt"),
                "match_count": len(matches),
                "first_match": matches[0],
            })
        if len(results) >= limit:
            break

    if not results:
        print(f"No sessions matching: {pattern}")
        return

    print(f"Found {len(results)} session(s) matching: {pattern}\n")
    for r in results:
        ts = ""
        if r["created"]:
            ts = datetime.fromtimestamp(r["created"] / 1000).strftime("%Y-%m-%d %H:%M")
        _, role, text = r["first_match"]
        print(f"  {r['session_id']}")
        print(f"    Title:   {r['title']}")
        print(f"    Model:   {r['model']}  Date: {ts}")
        print(f"    Matches: {r['match_count']}")
        print(f"    First:   [{role}] {truncate(text, 150)}")
        print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Extract conversation from Claude session audit logs"
    )
    ap.add_argument("session", nargs="?", help="Session ID, directory, or audit.jsonl path")
    ap.add_argument("--summary", action="store_true", help="Print metadata summary only")
    ap.add_argument("--search", "-s", help="Regex pattern to filter / search")
    ap.add_argument("--sessions-dir", help="Path to .claude-sessions directory")
    ap.add_argument("--max-result-len", type=int, default=300,
                    help="Max chars shown per tool result (default 300)")
    ap.add_argument("--limit", type=int, default=10,
                    help="Max sessions returned in cross-session search (default 10)")
    ap.add_argument("--compact", "-c", action="store_true",
                    help="Truncate long text blocks (useful for overview)")

    args = ap.parse_args()
    sessions_dir = Path(args.sessions_dir) if args.sessions_dir else find_sessions_dir()

    # Cross-session search (no session specified)
    if args.search and not args.session:
        if not sessions_dir:
            print("Error: cannot find .claude-sessions directory. Use --sessions-dir.", file=sys.stderr)
            sys.exit(1)
        search_all_sessions(sessions_dir, args.search, args.limit)
        return

    if not args.session:
        ap.print_help()
        sys.exit(1)

    meta, audit = resolve_session(args.session, sessions_dir)
    if not audit or not Path(audit).exists():
        print(f"Error: no audit.jsonl for session: {args.session}", file=sys.stderr)
        sys.exit(1)

    if args.summary:
        print_summary(meta, audit)
    else:
        print_transcript(audit, search_pattern=args.search, max_result=args.max_result_len, compact=args.compact)


if __name__ == "__main__":
    main()

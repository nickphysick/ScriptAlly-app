#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook (matcher: Bash) — the test slot's door-keeper. Installed machine-wide by
 * `npm run hooks:install` (scripts/hooks/install.mjs). Reads the hook JSON on stdin; exit 2 with a
 * one-line reason blocks the command, exit 0 lets it through. FAILS OPEN: if this hook itself errors
 * it allows the command and logs the error to ~/.cache/queryhawk/hook-errors.log.
 */
import { classify } from "./pretool-core.mjs";
import { logHookError } from "./slot-core.mjs";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    if (input.tool_name && input.tool_name !== "Bash") process.exit(0);
    const verdict = classify(input.tool_input?.command ?? "", input.cwd);
    if (verdict.block) { process.stderr.write(`${verdict.reason}\n`); process.exit(2); }
    process.exit(0);
  } catch (e) {
    logHookError("pretool-bash", e);
    process.exit(0);
  }
});

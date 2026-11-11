#!/usr/bin/env node
/**
 * npm run hooks:install — install the test-slot hooks for EVERY Claude Code session on this Mac.
 *
 *   1. copies scripts/hooks/*.mjs (except this file) to ~/.claude/hooks/queryhawk/
 *   2. backs up ~/.claude/settings.json to ~/.claude/settings.json.bak-<YYYY-MM-DD-HHMMSS>
 *   3. MERGES its hook entries into it — PreToolUse (Bash: the test slot; Bash|Edit|Write|MultiEdit|
 *      NotebookEdit: worktree claims), SessionStart, SessionEnd — keeping every
 *      other setting and hook. Re-running replaces only its own entries (matched by the install path).
 *
 * Machine-wide on purpose: a session on an old branch or in another worktree is held to the same slot.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const SRC = resolve(new URL(".", import.meta.url).pathname);
const CLAUDE = process.env.CLAUDE_HOME || join(homedir(), ".claude");
const DEST = join(CLAUDE, "hooks", "queryhawk");
const SETTINGS = join(CLAUDE, "settings.json");
const MARK = "/hooks/queryhawk/";

mkdirSync(DEST, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith(".mjs") && f !== "install.mjs");
for (const f of files) copyFileSync(join(SRC, f), join(DEST, f));
console.log(`copied ${files.length} files to ${DEST}: ${files.join(", ")}`);

let settings = {};
if (existsSync(SETTINGS)) {
  const raw = readFileSync(SETTINGS, "utf8");
  settings = JSON.parse(raw); // a settings file we cannot parse stops the install rather than being replaced
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const bak = `${SETTINGS}.bak-${stamp}`;
  writeFileSync(bak, raw);
  console.log(`backed up ${SETTINGS} to ${bak}`);
}

const cmd = (f) => `node "${join(DEST, f)}"`;
const ours = (entry) => (entry?.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes(MARK));
const want = {
  PreToolUse: [
    { matcher: "Bash", hooks: [{ type: "command", command: cmd("pretool-bash.mjs"), timeout: 10 }] },
    { matcher: "Bash|Edit|Write|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: cmd("pretool-claim.mjs"), timeout: 10 }] },
  ],
  SessionStart: { hooks: [{ type: "command", command: cmd("session-start.mjs"), timeout: 30 }] },
  SessionEnd: { hooks: [{ type: "command", command: cmd("session-end.mjs"), timeout: 30 }] },
};
settings.hooks = settings.hooks ?? {};
for (const [event, entry] of Object.entries(want)) {
  const kept = (settings.hooks[event] ?? []).filter((e) => !ours(e));
  settings.hooks[event] = [...kept, ...(Array.isArray(entry) ? entry : [entry])];
}
writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
console.log(`merged the test-slot hooks into ${SETTINGS}:`);
console.log(JSON.stringify(settings.hooks, null, 2));

/**
 * The PreToolUse (Bash) rule for the test slot — pure, so src/test/slotHooks.test.ts can drive it.
 *
 * ⚠️ SELF-CONTAINED (node built-ins only): `npm run hooks:install` copies it machine-wide, and it runs
 * for every Claude Code session on every branch and in every project. It only ever blocks inside a
 * QueryHawk checkout (a git root carrying firebase.dev.json), and it judges what each segment of the
 * command RUNS — never words inside quotes — so `grep "playwright test" notes.md` passes.
 *
 * Blocks:
 *   1. starting emulators, Playwright or the Firestore JVM directly instead of through an npm script
 *      (which goes through scripts/emu-guard.mjs and the test slot); `playwright test --list` is
 *      allowed — it collects specs and starts no browser;
 *   2. a heavy npm script or tests/e2e/*.sh runner in a checkout that predates the test slot;
 *   3. a test command repeated: inside a for/while/until loop, or the same one twice in one command.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export const HEAVY_NPM = ["e2e", "e2e:emu", "dev:emu", "emu:seed", "test:rules", "test:functions"];

/** Drop heredoc bodies: text being written to a file or piped in is data, not commands. */
export function stripHeredocs(cmd) {
  const lines = cmd.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (!m) continue;
    const end = m[2];
    while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
    i++; // the delimiter line itself
  }
  return out.join("\n");
}

/** Split a shell command into simple-command segments, honouring quotes. */
export function segments(cmd) {
  const out = [];
  let cur = "", q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { cur += c; if (c === q && cmd[i - 1] !== "\\") q = null; continue; }
    if (c === "'" || c === '"' || c === "`") { q = c; cur += c; continue; }
    if (c === "\n" || c === ";" || c === "(" || c === ")" || c === "{" || c === "}") { out.push(cur); cur = ""; continue; }
    if ((c === "&" || c === "|")) { out.push(cur); cur = ""; if (cmd[i + 1] === c) i++; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Strip what does not change which program runs: VAR=value, env, time, nice -n N, exec, command, do/then/else. */
export function head(seg) {
  let s = seg;
  for (let n = 0; n < 12; n++) {
    const before = s;
    s = s.replace(/^(do|then|else|elif)\s+/, "")
      .replace(/^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|'[^']*'|\S*)\s+/, "")
      .replace(/^(env|time|exec|command|nohup)\s+/, "")
      .replace(/^nice(\s+-n\s*-?\d+|\s+-\d+)?\s+/, "");
    if (s === before) break;
  }
  return s;
}

const isPlaywright = (h) => /^(npx\s+(--yes\s+)?|pnpm\s+(exec\s+)?|yarn\s+|bunx\s+)?playwright\s+test\b/.test(h) || /node_modules\/\.bin\/playwright\s+test\b/.test(h);
const isEmulators = (h) => /^(npx\s+(--yes\s+)?)?(firebase|firebase-tools)\s+emulators:(start|exec)\b/.test(h) || /node_modules\/\.bin\/firebase\s+emulators:(start|exec)\b/.test(h);
const isFirestoreJvm = (h) => /^(\S*\/)?java\b/.test(h) && /cloud-firestore/.test(h);
const npmScript = (h) => { const m = h.match(/^npm\s+(?:run(?:-script)?|test\b)\s*([^\s]*)/); if (!m) return null; return h.startsWith("npm test") ? "test" : m[1]; };
const isRunner = (h) => /^((bash|zsh|sh)\s+)?\S*tests\/e2e\/[^\s]+\.sh\b/.test(h);
const isVitest = (h) => /^(npx\s+)?vitest\b/.test(h);

/** The test-command identity of a segment, or null. Two segments with one identity are a repeat. */
export function testKey(h) {
  if (isPlaywright(h)) return h.replace(/\s+/g, " ");
  if (isEmulators(h)) return h.replace(/\s+/g, " ");
  const s = npmScript(h);
  if (s && (HEAVY_NPM.includes(s) || s === "test")) return `npm run ${s}`;
  if (isRunner(h)) return h.replace(/\s+/g, " ");
  if (isVitest(h)) return h.replace(/\s+/g, " ");
  return null;
}

const gitRoot = (cwd) => { try { return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const expand = (p, cwd) => { const t = p.replace(/^["']|["']$/g, "").replace(/^~(?=\/|$)/, homedir()); return isAbsolute(t) ? t : resolve(cwd, t); };

/** → { block: false } or { block: true, reason } */
export function classify(command, cwd, { rootOf = gitRoot } = {}) {
  if (typeof command !== "string" || !command.trim()) return { block: false };
  let here = cwd || process.cwd();
  command = stripHeredocs(command);
  const segs = segments(command);
  const loop = /(^|[\s;&|(])(for|while|until)\s[\s\S]*?(^|[\s;])do(\s|$)/.test(command);
  const seen = new Map();
  let anyTest = false;
  for (const seg of segs) {
    const h = head(seg);
    const cd = h.match(/^cd\s+(\S+)\s*$/);
    if (cd) { here = expand(cd[1], here); continue; }
    const root = rootOf(here);
    const ours = !!root && existsSync(join(root, "firebase.dev.json"));
    if (!ours) continue;
    const key = testKey(h);
    if (key) {
      anyTest = true;
      if (seen.has(key)) return { block: true, reason: "One run at a time; read the result before the next. (The same test command appears twice in one command.)" };
      seen.set(key, true);
    }
    if (isPlaywright(h) && !/\s--list\b/.test(h)) return { block: true, reason: "Run Playwright through `npm run e2e` or `npm run e2e:emu` — they go through scripts/emu-guard.mjs and the test slot (one heavy job at a time on this Mac). `playwright test --list` is allowed." };
    if (isEmulators(h)) return { block: true, reason: "Start emulators through an npm script (e2e:emu, dev:emu, emu:seed, test:rules, test:functions), never `firebase emulators:*` directly — the npm scripts go through the test slot." };
    if (isFirestoreJvm(h)) return { block: true, reason: "Never start the Firestore emulator JVM by hand — use an npm script, which goes through the test slot." };
    const s = npmScript(h);
    if ((s && HEAVY_NPM.includes(s)) || isRunner(h)) {
      if (!existsSync(join(root, "scripts", "heavy-slot.mjs"))) return { block: true, reason: "This branch predates the test slot — merge main first." };
    }
  }
  if (loop && anyTest) return { block: true, reason: "One run at a time; read the result before the next. (A test command inside a for/while/until loop.)" };
  return { block: false };
}

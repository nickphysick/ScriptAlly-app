/**
 * Worktree claims: one Claude Code session per worktree, enforced by hooks.
 *
 *   ~/.cache/queryhawk/claims/<sha1 of the worktree root>.json
 *     { root, branch, sessionId, ownerPid, claimedAt, lastSeen, firstTask }
 *
 * The first session to CHANGE a worktree (an edit, or a Bash command that writes into it) claims it;
 * another live session that tries to change it is blocked. Reading is never blocked.
 *
 * LIVENESS: each session is one `…/MacOS/claude` process (desktop app) or `claude` process (CLI), an
 * ancestor of the hook. That pid is `ownerPid`, and the claim is dead the moment it is gone. Only when
 * no pid could be found does the claim fall back to `lastSeen` older than 3 hours.
 * A session resumed under a new pid keeps the same session id, so it is still the owner.
 *
 * ⚠️ SELF-CONTAINED (node built-ins + pretool-core.mjs): copied machine-wide by `npm run hooks:install`.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, openSync, readSync, closeSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { segments, head, stripHeredocs } from "./pretool-core.mjs";

export const CACHE = process.env.HEAVY_SLOT_CACHE || join(homedir(), ".cache", "queryhawk");
export const CLAIMS = join(CACHE, "claims");
export const STALE_MS = 3 * 60 * 60 * 1000;

const real = (p) => { try { return realpathSync(p); } catch { return p; } };
export const keyOf = (root) => createHash("sha1").update(real(root)).digest("hex");
export const hhmm = (iso) => { try { return new Date(iso).toTimeString().slice(0, 5); } catch { return "?"; } };

/* ── git and processes (injectable for tests) ─────────────────────────────────────────────────── */
export function gitRoot(dir) {
  let d = dir;
  while (d && !existsSync(d)) { const up = dirname(d); if (up === d) return null; d = up; }
  try { return real(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: d, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()); } catch { return null; }
}
export const branchOf = (root) => { try { return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return "?"; } };
export const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

/** The session's own process: the nearest ancestor that is the Claude Code binary. */
export function findOwnerPid(start = process.ppid) {
  let p = start;
  for (let i = 0; i < 30 && p > 1; i++) {
    let out = "";
    try { out = execFileSync("ps", ["-o", "ppid=,command=", "-p", String(p)], { encoding: "utf8" }).trim(); } catch { return null; }
    const m = out.match(/^(\d+)\s+(.*)$/s);
    if (!m) return null;
    const cmd = m[2];
    if (/\/MacOS\/claude(\s|$)/.test(cmd) || /^(\S*\/)?claude(\s|$)/.test(cmd) || /node\s+\S*\/claude(-code)?\/\S*cli\.(m?js)\b/.test(cmd)) return p;
    p = Number(m[1]);
  }
  return null;
}

/** The first prompt of a session, for the "in use by" message. Reads at most 512 KB of the transcript. */
export function firstTaskOf(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return "";
  let text = "";
  try { const fd = openSync(transcriptPath, "r"); const buf = Buffer.alloc(512 * 1024); const n = readSync(fd, buf, 0, buf.length, 0); closeSync(fd); text = buf.subarray(0, n).toString("utf8"); } catch { return ""; }
  for (const line of text.split("\n")) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e?.type !== "user" || e?.isMeta) continue;
    const c = e.message?.content;
    const s = typeof c === "string" ? c : Array.isArray(c) ? c.filter((x) => x?.type === "text").map((x) => x.text).join(" ") : "";
    const clean = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (clean) return clean.slice(0, 80);
  }
  return "";
}

/* ── the store ───────────────────────────────────────────────────────────────────────────────── */
export function makeStore(dir = CLAIMS) {
  const path = (root) => join(dir, `${keyOf(root)}.json`);
  return {
    dir,
    get(root) { try { return JSON.parse(readFileSync(path(root), "utf8")); } catch { return null; } },
    put(claim) { mkdirSync(dir, { recursive: true }); writeFileSync(path(claim.root), JSON.stringify(claim, null, 2)); },
    drop(root) { rmSync(path(root), { force: true }); },
    all() { try { return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => { try { return JSON.parse(readFileSync(join(dir, f), "utf8")); } catch { return null; } }).filter(Boolean); } catch { return []; } },
  };
}

export function isDead(claim, { now = Date.now(), isAlive = alive } = {}) {
  if (claim.ownerPid) return !isAlive(claim.ownerPid);
  return now - Date.parse(claim.lastSeen || claim.claimedAt || 0) > STALE_MS;
}

/**
 * Decide one change to `root` by session `me` ({ sessionId, ownerPid, firstTask }).
 * → { allow: true, note? } or { allow: false, reason }
 */
export function decide(root, me, { store, now = Date.now(), isAlive = alive, branch = () => "?" } = {}) {
  const iso = new Date(now).toISOString();
  const c = store.get(root);
  if (c && c.sessionId === me.sessionId) {
    store.put({ ...c, lastSeen: iso, ownerPid: me.ownerPid || c.ownerPid });
    return { allow: true };
  }
  if (c && !isDead(c, { now, isAlive })) {
    const task = c.firstTask ? ` (${c.firstTask})` : "";
    return { allow: false, reason: `This worktree (${c.branch}) is in use by another session since ${hhmm(c.claimedAt)}${task}. Use your own worktree, or ask Nick to release it: node scripts/worktree-claim.mjs release ${c.root}` };
  }
  const claim = { root, branch: branch(root), sessionId: me.sessionId, ownerPid: me.ownerPid ?? null, claimedAt: iso, lastSeen: iso, firstTask: me.firstTask || "" };
  store.put(claim);
  const note = c ? `Reclaimed ${root} (${c.branch}): its previous session ${c.sessionId.slice(0, 8)} (claimed ${hhmm(c.claimedAt)}) is no longer running.` : undefined;
  return { allow: true, note };
}

/* ── which worktrees a tool call would change ────────────────────────────────────────────────── */
const GIT_WRITES = new Set(["commit", "checkout", "switch", "merge", "rebase", "reset", "restore", "stash", "cherry-pick", "pull", "am", "add", "rm", "mv", "revert", "apply", "clean"]);
const NPM_WRITES = new Set(["install", "i", "ci", "uninstall", "update", "add"]);

const unquote = (t) => t.replace(/^(["'])(.*)\1$/s, "$2");
/** Words of a simple command, honouring quotes. */
export function words(seg) {
  const out = []; let cur = "", q = null, any = false;
  for (const c of seg) {
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; any = true; continue; }
    if (/\s/.test(c)) { if (cur || any) out.push(cur); cur = ""; any = false; continue; }
    cur += c;
  }
  if (cur || any) out.push(cur);
  return out;
}
/** Unquoted output redirections in a segment: their targets. `>/dev/null`, `2>&1`, `>&2` are not files. */
export function redirectTargets(seg) {
  const out = []; let q = null;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c !== ">") continue;
    let j = i + 1;
    if (seg[j] === ">" || seg[j] === "|") j++;
    if (seg[j] === "&") { i = j; continue; } // 2>&1, >&2
    while (seg[j] === " ") j++;
    const m = seg.slice(j).match(/^("[^"]*"|'[^']*'|[^\s;&|<>()]+)/);
    if (m) { const t = unquote(m[1]); if (t && !t.startsWith("/dev/")) out.push(t); i = j + m[1].length - 1; }
  }
  return out;
}

/**
 * The worktree roots a Bash command would change, following `cd`. Read-only commands give [].
 */
export function bashRoots(command, cwd, { rootOf = gitRoot } = {}) {
  let here = cwd || process.cwd();
  const roots = new Set();
  /* ⚠️ A PATH THE SHELL HAS NOT EXPANDED YET ($VAR, `cmd`, $(…)) IS UNKNOWN, AND UNKNOWN CLAIMS NOTHING.
   * Read literally, `cd "$P/W" && git commit` resolved "$P/W" under the current folder and claimed
   * the session's own checkout for a commit in a scratch repo. After an unknown `cd`, every later
   * segment is unknown too, until a cd to a literal path. */
  const unknown = (p) => /[$`]/.test(p);
  const at = (p) => { if (here === null || unknown(p)) return; const abs = isAbsolute(p) ? p : resolve(here, p.replace(/^~(?=\/|$)/, homedir())); const r = rootOf(dirname(abs)); if (r) roots.add(r); };
  const atCwd = () => { if (here === null) return; const r = rootOf(here); if (r) roots.add(r); };
  for (const seg of segments(stripHeredocs(command || ""))) {
    for (const t of redirectTargets(seg)) at(t.replace(/^~(?=\/|$)/, homedir()));
    const w = words(head(seg));
    if (!w.length) continue;
    const [cmd, ...args] = w;
    if (cmd === "cd") {
      const t = args[0];
      if (!t) continue;
      if (unknown(t)) here = null;
      else here = isAbsolute(t) ? t : here === null ? null : resolve(here, t.replace(/^~(?=\/|$)/, homedir()));
      continue;
    }
    const files = args.filter((a) => !a.startsWith("-"));
    if (cmd === "git") {
      let i = 0, dir = here;
      while (i < args.length && args[i].startsWith("-")) { if (args[i] === "-C" && args[i + 1]) { dir = unknown(args[i + 1]) ? null : isAbsolute(args[i + 1]) ? args[i + 1] : dir === null ? null : resolve(dir, args[i + 1]); i += 2; } else i++; }
      if (GIT_WRITES.has(args[i]) && dir !== null) { const r = rootOf(dir); if (r) roots.add(r); }
    } else if (cmd === "npm" && NPM_WRITES.has(args[0])) atCwd();
    else if (cmd === "sed" && args.some((a) => /^-i/.test(a) || /^-[a-zA-Z]*i/.test(a))) {
      const hasE = args.includes("-e");
      const rest = files.slice(hasE ? 0 : 1);
      rest.forEach(at);
    } else if (cmd === "tee") files.forEach(at);
    else if (cmd === "rm" || cmd === "mv") files.forEach(at);
    else if (cmd === "cp" && files.length) at(files[files.length - 1]);
  }
  return [...roots];
}

/** The worktree root an Edit / Write / MultiEdit / NotebookEdit call would change, or null. */
export function editRoot(toolInput, { rootOf = gitRoot } = {}) {
  const p = toolInput?.file_path || toolInput?.notebook_path;
  if (!p) return null;
  return rootOf(dirname(resolve(p)));
}

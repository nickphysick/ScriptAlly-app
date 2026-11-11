/**
 * The test slot's core: one heavy job (emulators, an e2e build, Playwright) at a time on this Mac.
 *
 * ⚠️ SELF-CONTAINED ON PURPOSE — node built-ins only, no repo imports. `npm run hooks:install` copies
 * this file to ~/.claude/hooks/queryhawk/ beside the hooks, and those hooks run for every session on
 * every branch, including branches whose tree predates this file.
 *
 *   ~/.cache/queryhawk/heavy-slot/            the lock: `mkdir` is atomic, so exactly one acquirer wins
 *   ~/.cache/queryhawk/heavy-slot/holder.json { pid, pgids, token, worktree, branch, command, startedAt }
 *
 * A holder whose pid is dead is stale and is reclaimed at once. Because the slot is exclusive, any
 * Firebase emulator, vite preview on 4321 or orphaned Playwright browser still running when the slot is
 * acquired (or found free) belongs to nobody — it is a leftover, and `sweep` clears it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, appendFileSync, statSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const CACHE = process.env.HEAVY_SLOT_CACHE || join(homedir(), ".cache", "queryhawk");
export const SLOT = join(CACHE, "heavy-slot");
export const HOLDER = join(SLOT, "holder.json");
const POLL_MS = Number(process.env.HEAVY_SLOT_POLL_MS) || 10_000;
const GIVE_UP_MS = Number(process.env.HEAVY_SLOT_TIMEOUT_MS) || 45 * 60_000;

export const say = (m) => console.error(`[heavy-slot] ${m}`);
export const alive = (pid) => {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};
export const readHolder = () => {
  try { return JSON.parse(readFileSync(HOLDER, "utf8")); } catch { return null; }
};
const hhmm = (iso) => { try { return new Date(iso).toTimeString().slice(0, 5); } catch { return "?"; } };
const git = (cwd, args) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
export const pgidOf = (pid) => { try { return Number(execFileSync("ps", ["-o", "pgid=", "-p", String(pid)], { encoding: "utf8" }).trim()) || null; } catch { return null; } };

/** "free" | "held" | "stale" — and the holder, if any. */
export function slotState() {
  if (!existsSync(SLOT)) return { state: "free", holder: null };
  const h = readHolder();
  /* A directory with no readable holder.json: the acquirer is between mkdir and write (milliseconds), or
   * it died there. Treat it as held for one poll; an unreadable holder older than a minute is stale. */
  if (!h) {
    let age = 0; try { age = Date.now() - statSync(SLOT).mtimeMs; } catch { /* gone */ }
    return { state: "held", holder: null, age };
  }
  return { state: alive(h.pid) ? "held" : "stale", holder: h };
}

const tryTake = (meta) => {
  try { mkdirSync(SLOT, { recursive: false }); } catch (e) {
    if (e.code === "ENOENT") { mkdirSync(CACHE, { recursive: true }); return tryTake(meta); }
    return false;
  }
  writeFileSync(HOLDER, JSON.stringify(meta, null, 2));
  return true;
};

/**
 * Wait for the slot and take it. Re-entrant: when HEAVY_SLOT_TOKEN in the environment matches the
 * holder's token, an ancestor already holds the slot and this call returns that holding (no sweep).
 * Returns { token, release, reentrant } or exits the process after GIVE_UP_MS.
 */
export async function acquire({ cwd = process.cwd(), command = process.argv.join(" ") } = {}) {
  const inherited = process.env.HEAVY_SLOT_TOKEN;
  const h0 = readHolder();
  if (inherited && h0 && h0.token === inherited && alive(h0.pid)) {
    return { token: inherited, reentrant: true, release: () => {}, addPgid: (g) => addPgid(inherited, g) };
  }
  const worktree = git(cwd, ["rev-parse", "--show-toplevel"]) || cwd;
  const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]) || "?";
  const token = randomUUID();
  const meta = { pid: process.pid, pgids: [], token, worktree, branch, command, startedAt: new Date().toISOString() };
  const t0 = Date.now();
  let told = false;
  for (;;) {
    if (tryTake(meta)) break;
    const { state, holder } = slotState();
    if (state === "stale") {
      say(`reclaiming a stale slot: holder pid ${holder.pid} (${holder.branch}, ${holder.worktree}) is no longer running.`);
      rmSync(SLOT, { recursive: true, force: true });
      continue;
    }
    if (!holder && existsSync(SLOT)) {
      /* holder.json never arrived: give it one poll, then reclaim */
      if (told) { say("reclaiming a slot with no holder record."); rmSync(SLOT, { recursive: true, force: true }); continue; }
    }
    if (!told) {
      say(holder
        ? `Waiting for the test slot — held by ${holder.branch} (${holder.worktree}) since ${hhmm(holder.startedAt)}`
        : "Waiting for the test slot — being taken by another job");
      told = true;
    }
    if (Date.now() - t0 > GIVE_UP_MS) {
      say(`gave up after ${Math.round(GIVE_UP_MS / 60000)} min waiting for the test slot. Nothing was run.`);
      process.exit(75);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  if (told) say(`got the test slot after ${Math.round((Date.now() - t0) / 1000)} s.`);
  process.env.HEAVY_SLOT_TOKEN = token;
  /* HEAVY_SLOT_SWEEP=dry lists what would go without killing it (proofs, self-tests); =off skips it. */
  const mode = process.env.HEAVY_SLOT_SWEEP || "on";
  if (mode !== "off") sweep({ dryRun: mode === "dry", quiet: false, reason: "on acquire" });
  let released = false;
  const release = () => {
    if (released) return; released = true;
    const h = readHolder();
    if (h && h.token === token) rmSync(SLOT, { recursive: true, force: true });
  };
  process.on("exit", release);
  return { token, reentrant: false, release, addPgid: (g) => addPgid(token, g) };
}

function addPgid(token, pgid) {
  const h = readHolder();
  if (!h || h.token !== token || !pgid) return;
  h.pgids = [...new Set([...(h.pgids || []), pgid])];
  writeFileSync(HOLDER, JSON.stringify(h, null, 2));
}

/** Release the slot regardless of holder, killing the holder's process groups first. */
export function forceRelease(h = readHolder(), why = "forced") {
  if (h) {
    for (const g of [...(h.pgids || [])].reverse()) { try { process.kill(-g, "SIGTERM"); } catch { /* gone */ } }
    try { process.kill(h.pid, "SIGTERM"); } catch { /* gone */ }
    say(`released the slot held by pid ${h.pid} (${h.branch}, ${h.worktree}) — ${why}.`);
  }
  rmSync(SLOT, { recursive: true, force: true });
}

/** Processes that only a heavy job starts: what a free slot means are leftovers. */
export function leftovers() {
  const me = userInfo().username;
  let out = "";
  try { out = execFileSync("ps", ["-axo", "pid=,ppid=,user=,etime=,rss=,command="], { encoding: "utf8", maxBuffer: 16 << 20 }); } catch { return []; }
  const rows = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, ppid, user, etime, rss, cmd] = m;
    if (user !== me || Number(pid) === process.pid) continue;
    let kind = null;
    if (/\bjava\b.*\bcloud-firestore-emulator[^/\s]*\.jar/.test(cmd)) kind = "firestore emulator";
    else if (/\bjava\b.*\bcloud-storage-rules-runtime[^/\s]*\.jar/.test(cmd)) kind = "storage rules runtime";
    else if (/(^|\/)(node|firebase)\b.*\bfirebase(\.js)?\s+emulators:(exec|start)\b/.test(cmd) || /node_modules\/\.bin\/firebase emulators:(exec|start)\b/.test(cmd)) kind = "emulator CLI";
    else if (/\bvite(\.js)?\s+preview\b.*--port[ =]4321\b/.test(cmd)) kind = "vite preview :4321";
    else if (/ms-playwright\/.*(chrom|firefox|webkit)/i.test(cmd) && Number(ppid) === 1) kind = "orphaned Playwright browser";
    if (kind) rows.push({ pid: Number(pid), ppid: Number(ppid), etime, rssMb: Math.round(Number(rss) / 1024), kind, cmd: cmd.slice(0, 160) });
  }
  return rows;
}

/** Kill every leftover (or list them with dryRun). Only ever call it with the slot held or free. */
export function sweep({ dryRun = false, quiet = false, reason = "" } = {}) {
  const rows = leftovers();
  if (!rows.length) { if (!quiet) say(`sweep${reason ? ` (${reason})` : ""}: nothing left over.`); return rows; }
  for (const r of rows) say(`${dryRun ? "would kill" : "killing"} ${r.kind} pid ${r.pid}, age ${r.etime}, ${r.rssMb} MB${reason ? ` (${reason})` : ""}`);
  if (dryRun) return rows;
  for (const r of rows) { try { process.kill(r.pid, "SIGTERM"); } catch { /* gone */ } }
  const until = Date.now() + 3000;
  while (Date.now() < until && rows.some((r) => alive(r.pid))) execFileSync("sleep", ["0.2"]);
  for (const r of rows) if (alive(r.pid)) { try { process.kill(r.pid, "SIGKILL"); } catch { /* gone */ } }
  return rows;
}

export function logHookError(where, e) {
  try {
    mkdirSync(CACHE, { recursive: true });
    appendFileSync(join(CACHE, "hook-errors.log"), `${new Date().toISOString()} ${where}: ${e && e.stack ? e.stack : e}\n`);
  } catch { /* nothing more we can do; the hook still fails open */ }
}

#!/usr/bin/env node
/**
 * The one door every emulator run goes through:
 *
 *   node scripts/emu-guard.mjs <command> [args...]
 *
 * e.g. `node scripts/emu-guard.mjs npx firebase emulators:exec --only firestore … 'npx vitest run'`.
 * `scripts/emu.mjs` (emu:seed, dev:emu, e2e:emu) and package.json's test:rules / test:functions all
 * call it; `src/test/emuGuard.test.ts` fails on any `emulators:exec|start` that does not.
 *
 * ⚠️ WHY IT EXISTS (6 Nov). firebase-tools starts the Firestore emulator at debug level FINE and
 * writes `firestore-debug.log` / `firebase-debug.log` in the working directory with no limit. Every
 * commit the rules refuse is a full Java stack trace, so one worktree's logs reached 34 GB, were
 * cleared, and reached 38 GB again within hours — leaving the Mac with 4 GB free.
 *
 *   a) PRE-FLIGHT — refuses to start under EMU_MIN_FREE_GB free on this volume (default 20).
 *   b) LOGS — every *-debug.log in the working directory is replaced by a symlink to /dev/null.
 *      EMU_DEBUG_LOG=1 keeps real logs here (deleted on exit); EMU_DEBUG_LOG=<absolute dir> points
 *      the names at that directory instead, so the logs survive the run. Both are capped by (c).
 *   c) WATCHDOG — every 5 s: under EMU_KILL_FREE_GB free (default 10), or (with real logs) any log
 *      over EMU_MAX_LOG_MB (default 200), the whole emulator process group is killed and the guard
 *      exits non-zero saying why.
 *   d) ON EXIT, pass or fail — the working directory's debug logs (and symlinks) and dist-emu/ are
 *      removed. Emulator data is never written by the guard; the committed tests/emulator-data/
 *      snapshot is the only data that persists (and only `emu:seed` writes it).
 */
import { spawn } from "node:child_process";
import { lstatSync, readdirSync, rmSync, statSync, statfsSync, symlinkSync, unlinkSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
export const LOG_NAMES = [
  "firestore-debug.log", "firebase-debug.log", "ui-debug.log",
  "database-debug.log", "pubsub-debug.log", "storage-debug.log",
];
const GB = 1024 ** 3;
const num = (v, d) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

const MIN_FREE_GB = num(process.env.EMU_MIN_FREE_GB, 20);
const KILL_FREE_GB = num(process.env.EMU_KILL_FREE_GB, 10);
const MAX_LOG_MB = num(process.env.EMU_MAX_LOG_MB, 200);
const POLL_MS = num(process.env.EMU_POLL_MS, 5000);
const DEBUG = process.env.EMU_DEBUG_LOG ?? "";
const keepDir = DEBUG && DEBUG !== "1" ? DEBUG : null;
const realLogs = DEBUG !== "";

export const freeGb = (dir = ROOT) => {
  const s = statfsSync(dir);
  return (s.bavail * s.bsize) / GB;
};
const fmt = (gb) => `${gb.toFixed(1)} GB`;
const say = (m) => console.error(`[emu-guard] ${m}`);

/* Every debug-log name that matches in the working directory, including ones firebase-tools adds
 * later than LOG_NAMES knows about. */
const logsHere = () => {
  const extra = readdirSync(ROOT).filter((f) => f.endsWith("-debug.log"));
  return [...new Set([...LOG_NAMES, ...extra])];
};
const removeLogs = () => {
  for (const name of logsHere()) {
    const p = join(ROOT, name);
    try { lstatSync(p); unlinkSync(p); } catch { /* absent */ }
  }
};

function main(argv) {
  if (argv.length === 0) {
    say("usage: node scripts/emu-guard.mjs <command> [args...]");
    return 2;
  }
  if (keepDir && !isAbsolute(keepDir)) {
    say(`EMU_DEBUG_LOG must be 1 or an absolute directory, got "${keepDir}"`);
    return 2;
  }

  /* a) pre-flight */
  const free = freeGb();
  if (free < MIN_FREE_GB) {
    say(`refusing to start: ${fmt(free)} free on this volume, under ${MIN_FREE_GB} GB (EMU_MIN_FREE_GB).`);
    say("clear old worktrees / *-debug.log first.");
    return 3;
  }

  /* b) logs */
  removeLogs();
  if (!realLogs) {
    for (const name of LOG_NAMES) symlinkSync("/dev/null", join(ROOT, name));
  } else if (keepDir) {
    for (const name of LOG_NAMES) symlinkSync(join(keepDir, name), join(ROOT, name));
  }
  say(`${fmt(free)} free. Debug logs: ${!realLogs ? "/dev/null" : keepDir ? keepDir : "real, deleted on exit"}.`);

  /* The child leads its own process group, so the watchdog can stop the emulators it starts. */
  const child = spawn(argv[0], argv.slice(1), { cwd: ROOT, stdio: "inherit", detached: true });
  let reason = null;
  let finished = false;

  const killGroup = (sig) => { try { process.kill(-child.pid, sig); } catch { /* gone */ } };
  const stop = (why) => {
    if (reason) return;
    reason = why;
    say(`STOPPING: ${why}`);
    killGroup("SIGTERM");
    setTimeout(() => { if (!finished) killGroup("SIGKILL"); }, 5000).unref();
  };

  /* c) watchdog */
  const tick = () => {
    const f = freeGb();
    if (f < KILL_FREE_GB) return stop(`free disk fell to ${fmt(f)}, under ${KILL_FREE_GB} GB (EMU_KILL_FREE_GB).`);
    if (!realLogs) return;
    for (const name of logsHere()) {
      let size = 0;
      try { size = statSync(join(ROOT, name)).size; } catch { continue; }
      if (size > MAX_LOG_MB * 1024 * 1024) {
        return stop(`${name} reached ${(size / 1024 / 1024).toFixed(1)} MB, over ${MAX_LOG_MB} MB (EMU_MAX_LOG_MB).`);
      }
    }
  };
  const timer = setInterval(tick, POLL_MS);

  /* Ctrl-C reaches the guard's group, not the child's, so it is forwarded. */
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => { killGroup(sig); setTimeout(() => killGroup("SIGKILL"), 5000).unref(); });
  }

  return new Promise((done) => {
    child.on("exit", (code, signal) => {
      finished = true;
      clearInterval(timer);
      /* Anything the group left running (an emulator the CLI did not reap) goes with it. */
      killGroup("SIGKILL");
      /* d) cleanup */
      removeLogs();
      rmSync(join(ROOT, "dist-emu"), { recursive: true, force: true });
      if (keepDir) say(`debug logs kept in ${keepDir}`);
      if (reason) {
        say(`run killed: ${reason}`);
        return done(4);
      }
      done(code ?? (signal ? 1 : 0));
    });
    child.on("error", (e) => { say(`could not start ${argv[0]}: ${e.message}`); finished = true; clearInterval(timer); removeLogs(); done(127); });
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("emu-guard.mjs")) {
  Promise.resolve(main(process.argv.slice(2))).then((code) => process.exit(code));
}

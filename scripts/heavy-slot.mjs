#!/usr/bin/env node
/**
 * The test slot — one heavy job (emulators, an e2e build, Playwright) at a time on this Mac.
 *
 *   node scripts/heavy-slot.mjs run -- <command…>   take the slot (queueing if held), run, release
 *   node scripts/heavy-slot.mjs status              who holds it, since when
 *   node scripts/heavy-slot.mjs sweep [--dry-run]   clear leftovers — refuses while a live job holds it
 *   node scripts/heavy-slot.mjs release             free a stuck slot by hand (kills the holder's groups)
 *   HEAVY_SLOT_SELFTEST=<seconds> node scripts/heavy-slot.mjs
 *                                                   take it, hold it that long, release — no emulator,
 *                                                   and its sweep only LISTS leftovers (never kills)
 *   HEAVY_SLOT_SWEEP=dry|off                        the acquire-time sweep lists only / is skipped
 *
 * scripts/emu-guard.mjs and scripts/emu.mjs take the slot themselves; everything heavy goes through
 * one of them (or `run`). The Claude Code hooks in scripts/hooks/ block the ways around it.
 * The lock lives outside every worktree: ~/.cache/queryhawk/heavy-slot/.
 */
import { spawn } from "node:child_process";
import { acquire, slotState, sweep, forceRelease, say } from "./hooks/slot-core.mjs";

const args = process.argv.slice(2);
const sub = args[0];

async function selftest(secs) {
  /* a self-test exists for proofs: it lists leftovers but never kills them */
  process.env.HEAVY_SLOT_SWEEP = "dry";
  const slot = await acquire({ command: `HEAVY_SLOT_SELFTEST=${secs}` });
  say(`selftest: holding the slot for ${secs} s (pid ${process.pid}).`);
  await new Promise((r) => setTimeout(r, secs * 1000));
  slot.release();
  say("selftest: released.");
  return 0;
}

async function run(cmd) {
  if (!cmd.length) { say("usage: heavy-slot.mjs run -- <command…>"); return 2; }
  const slot = await acquire({ command: cmd.join(" ") });
  const child = spawn("nice", ["-n", "10", ...cmd], { stdio: "inherit", detached: true, env: process.env });
  slot.addPgid(child.pid);
  const kill = (s) => { try { process.kill(-child.pid, s); } catch { /* gone */ } };
  for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => { kill(s); setTimeout(() => kill("SIGKILL"), 5000).unref(); });
  return new Promise((done) => child.on("exit", (code, sig) => { kill("SIGKILL"); slot.release(); done(code ?? (sig ? 1 : 0)); }));
}

async function main() {
  const st = Number(process.env.HEAVY_SLOT_SELFTEST);
  if (st > 0 && !sub) return selftest(st);
  if (sub === "run") return run(args[0] === "run" && args[1] === "--" ? args.slice(2) : args.slice(1));
  if (sub === "status") {
    const { state, holder } = slotState();
    if (state === "free") console.log("free");
    else console.log(`${state}: pid ${holder?.pid ?? "?"} · ${holder?.branch ?? "?"} · ${holder?.worktree ?? "?"} · since ${holder?.startedAt ?? "?"}\n  ${holder?.command ?? ""}`);
    return 0;
  }
  if (sub === "sweep") {
    const { state } = slotState();
    if (state === "held") { say("refusing to sweep: a live job holds the slot. Its processes are not leftovers."); return 1; }
    if (state === "stale") forceRelease(undefined, "stale holder before a sweep");
    sweep({ dryRun: args.includes("--dry-run"), reason: "by hand" });
    return 0;
  }
  if (sub === "release") { forceRelease(undefined, "released by hand"); return 0; }
  say("usage: heavy-slot.mjs run -- <cmd…> | status | sweep [--dry-run] | release   (or HEAVY_SLOT_SELFTEST=<s>)");
  return 2;
}
main().then((c) => process.exit(c));

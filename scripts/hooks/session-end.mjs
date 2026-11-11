#!/usr/bin/env node
/**
 * Claude Code SessionEnd hook — if this session's checkout holds the test slot, stop the holder's job
 * (its recorded process groups, then its pid) and release the slot — "this checkout" means the same
 * git root as the holder's; then, with the slot free, sweep
 * leftovers as SessionStart does. Never touches a slot held from another checkout. Fails open.
 */
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { slotState, forceRelease, sweep, logHookError } from "./slot-core.mjs";

const real = (p) => { try { return realpathSync(p); } catch { return p; } };
/* ⚠️ MATCH ON THE GIT ROOT, NEVER A PATH PREFIX: a session opened in the home folder "contains" every
 * worktree, and a prefix test would stop another checkout's job when it ended. */
const rootOf = (cwd) => { try { return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
let raw = "";
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const root = rootOf(input.cwd || process.cwd());
    const { state, holder } = slotState();
    if (state === "held" && holder) {
      if (root && real(root) === real(holder.worktree || "")) forceRelease(holder, "its session ended");
      else process.exit(0); // another checkout's live job
    } else if (state === "stale") forceRelease(holder, "stale holder found at session end");
    sweep({ quiet: true, reason: "session end" });
  } catch (e) { logHookError("session-end", e); }
  process.exit(0);
});

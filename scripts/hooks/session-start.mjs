#!/usr/bin/env node
/**
 * Claude Code SessionStart hook — clear leftovers from stopped sessions, but ONLY while the test slot is
 * free (a stale holder is released first). A live holder's processes are never touched. Also drops
 * worktree claims whose session is gone. Fails open.
 */
import { slotState, forceRelease, sweep, logHookError } from "./slot-core.mjs";
import { isDead, makeStore } from "./claim-core.mjs";

let raw = "";
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  /* worktree claims whose session is gone are dropped (claim-core.mjs) */
  try { const store = makeStore(); for (const c of store.all()) if (isDead(c)) store.drop(c.root); } catch (e) { logHookError("session-start claims", e); }
  try {
    const { state } = slotState();
    if (state === "held") process.exit(0);
    if (state === "stale") forceRelease(undefined, "stale holder found at session start");
    const killed = sweep({ quiet: true, reason: "session start" });
    const dry = process.env.HEAVY_SLOT_SWEEP === "dry";
    if (killed.length) console.log(`[test slot] ${dry ? "would clear" : "cleared"} ${killed.length} leftover test process(es) from earlier sessions.`);
  } catch (e) { logHookError("session-start", e); }
  process.exit(0);
});

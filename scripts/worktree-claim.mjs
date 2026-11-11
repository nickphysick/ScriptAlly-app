#!/usr/bin/env node
/**
 * Worktree claims — one Claude Code session per worktree (scripts/hooks/claim-core.mjs).
 *
 *   node scripts/worktree-claim.mjs status          every claim: worktree, branch, session, owner, alive?
 *   node scripts/worktree-claim.mjs release <root>  free one worktree (Nick's call — its session may be live)
 *   node scripts/worktree-claim.mjs release-dead    drop every claim whose session is gone
 */
import { resolve } from "node:path";
import { gitRoot, hhmm, isDead, makeStore } from "./hooks/claim-core.mjs";

const [sub, arg] = process.argv.slice(2);
const store = makeStore();
if (sub === "status") {
  const all = store.all();
  if (!all.length) console.log("no worktree is claimed");
  for (const c of all) console.log(`${isDead(c) ? "DEAD " : "live "} ${c.root}  [${c.branch}]  session ${c.sessionId.slice(0, 8)}  pid ${c.ownerPid ?? "?"}  since ${hhmm(c.claimedAt)}  last ${hhmm(c.lastSeen)}${c.firstTask ? `  — ${c.firstTask}` : ""}`);
} else if (sub === "release" && arg) {
  const root = gitRoot(resolve(arg)) || resolve(arg);
  const c = store.get(root);
  if (!c) { console.log(`not claimed: ${root}`); process.exit(0); }
  store.drop(root);
  console.log(`released ${root} [${c.branch}] from session ${c.sessionId.slice(0, 8)}${isDead(c) ? " (already dead)" : " (it was LIVE — that session can now be overwritten by another)"}`);
} else if (sub === "release-dead") {
  const dead = store.all().filter((c) => isDead(c));
  for (const c of dead) { store.drop(c.root); console.log(`released ${c.root} [${c.branch}] — session ${c.sessionId.slice(0, 8)} is gone`); }
  if (!dead.length) console.log("no dead claims");
} else {
  console.log("usage: node scripts/worktree-claim.mjs status | release <root> | release-dead");
  process.exit(2);
}

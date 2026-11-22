#!/usr/bin/env node
/**
 * Plan rules v1 — the one-off backfill: every account that exists on the project today becomes a founding writer.
 *
 *   ALLOW_LIVE_FIRESTORE=1 node scripts/backfill-founding-flags.mjs --project scriptally-dev [--over-cap] [--confirm]
 *
 * Without --confirm it prints the plan and writes nothing.
 *
 * ⚠️ PRODUCTION IS REFUSED unless --prod is passed as well, and it has not been run there. On prod the founding writers
 *    are the people let in (the backstop and scripts/founding-flag.mjs mark them); this script is for dev's test accounts.
 * ⚠️ THE CAP HOLDS unless --over-cap is passed. Dev has 87 accounts against a cap of 50, and Nick ruled (12 Nov) that
 *    every dev account becomes founding, so the dev run passes --over-cap; every account past the cap is printed.
 * ⚠️ IT FILLS ONLY AN ABSENT FLAG: founding stays founding, and an explicit unmark (`false`) is left alone.
 *    `foundingSource: "backfill"`, `foundingSince` the server's time.
 */
import { flag, target, client } from "./lib/adminRest.mjs";
import { decideFlag } from "./lib/foundingFlagDecide.mjs";

const USAGE = "usage: ALLOW_LIVE_FIRESTORE=1 node scripts/backfill-founding-flags.mjs --project <id> [--prod] [--over-cap] [--confirm]";
const FALLBACK_CAP = 50; // FOUNDING_CAP in src/marketing/foundingCap.ts and DEFAULT_CAP in functions/src/waitlistModel.ts

const t = target(USAGE);
if (t.isProd && !flag("--prod")) {
  console.error(`Refusing to backfill PRODUCTION (${t.project}) without --prod. On prod, founding writers are marked one by one.`);
  process.exit(2);
}
const overCap = flag("--over-cap");
const c = await client(t);
const accounts = (await c.listAccounts()).sort((a, b) => (a.createdMs ?? 0) - (b.createdMs ?? 0) || a.uid.localeCompare(b.uid));
const flags = await Promise.all(accounts.map((a) => c.readFounding(a.uid)));
const cap = (await c.readCap()) ?? FALLBACK_CAP;
let count = flags.filter((f) => f.founding === true).length;

const plan = [];
let over = 0, refused = 0, unmarked = 0;
accounts.forEach((a, i) => {
  const current = flags[i].founding;
  if (current === false) { unmarked++; return; } // an explicit unmark stays
  const d = decideFlag({ current, mark: true, foundingCount: count, cap, overCap });
  if (d.action === "mark") { if (count >= cap) over++; plan.push({ ...a, reason: d.reason }); count++; }
  else if (d.reason.startsWith("cap")) { refused++; console.warn(`cap: not marked ${a.uid} ${a.email ?? ""}`); }
});

console.log(`${t.project} (${t.database}${t.isProd ? ", PRODUCTION" : ""}) — ${accounts.length} accounts, cap ${cap}`);
console.log(`already founding ${flags.filter((f) => f.founding === true).length} · explicitly unmarked ${unmarked} · to mark ${plan.length} (${over} past the cap) · refused by the cap ${refused}`);
for (const p of plan) console.log(`  mark ${p.uid}  ${p.email ?? "(no email)"}  — ${p.reason}`);

if (!flag("--confirm")) { console.log("Dry run. Add --confirm to write it."); process.exit(0); }
for (const p of plan) await c.writeFounding(p.uid, true, "backfill");
const after = await Promise.all(accounts.map((a) => c.readFounding(a.uid)));
console.log(`written: ${plan.length}. Founding now ${after.filter((f) => f.founding === true).length} of ${accounts.length} accounts.`);

#!/usr/bin/env node
/**
 * Plan rules v1 — mark or unmark ONE account as a founding writer, by hand. Founder-only (Nick).
 *
 *   ALLOW_LIVE_FIRESTORE=1 node scripts/founding-flag.mjs --project <id> (--uid <uid> | --email <email>) (--mark | --unmark) [--confirm]
 *
 * Without --confirm it prints what it would change and changes nothing.
 *
 * ⚠️ IT WRITES ONE DOC: `users/{uid}/private/entitlement` — `founding`, `foundingSince` (server time, on a mark) and
 *    `foundingSource: "admin"`, merged; the Smart Import fields are left alone. An UNMARK writes `founding: false`, which
 *    the nightly backstop (foundingStats) never overrides.
 * ⚠️ A MARK RESPECTS THE CAP (`counters/waitlist.cap`, else 50 — `FOUNDING_CAP`): founding accounts are counted first.
 * ⚠️ The project is named by argument; its database comes from `DATABASES`. Works on prod (that is what it is for).
 */
import { arg, flag, target, client } from "./lib/adminRest.mjs";
import { decideFlag } from "./lib/foundingFlagDecide.mjs";

const USAGE = "usage: ALLOW_LIVE_FIRESTORE=1 node scripts/founding-flag.mjs --project <id> (--uid <uid> | --email <email>) (--mark | --unmark) [--confirm]";
const FALLBACK_CAP = 50; // FOUNDING_CAP in src/marketing/foundingCap.ts and DEFAULT_CAP in functions/src/waitlistModel.ts

const t = target(USAGE);
const uidArg = arg("--uid"), emailArg = arg("--email");
const mark = flag("--mark"), unmark = flag("--unmark");
if (!!uidArg === !!emailArg || mark === unmark) { console.error(USAGE); process.exit(2); }

const c = await client(t);
const accounts = await c.listAccounts();
const who = uidArg ? accounts.find((a) => a.uid === uidArg) : await c.lookupEmail(emailArg.trim().toLowerCase());
if (!who) { console.error(`No account for ${uidArg ? `uid ${uidArg}` : `email ${emailArg}`} on ${t.project}.`); process.exit(1); }

const flags = await Promise.all(accounts.map((a) => c.readFounding(a.uid)));
const foundingCount = flags.filter((f) => f.founding === true).length;
const cap = (await c.readCap()) ?? FALLBACK_CAP;
const now = await c.readFounding(who.uid);
const d = decideFlag({ current: now.founding, mark, foundingCount, cap });

console.log(`${t.project} (${t.database}${t.isProd ? ", PRODUCTION" : ""})`);
console.log(`account   ${who.uid}  ${who.email ?? "(no email)"}`);
console.log(`now       founding: ${now.founding === null ? "absent" : now.founding}${now.foundingSource ? ` (by ${now.foundingSource})` : ""}`);
console.log(`founding  ${foundingCount} of ${cap}`);
console.log(`change    ${d.action === "none" ? "nothing" : d.action} — ${d.reason}`);

if (d.action === "none") process.exit(d.reason.startsWith("cap") ? 1 : 0);
if (!flag("--confirm")) { console.log("Dry run. Add --confirm to write it."); process.exit(0); }
await c.writeFounding(who.uid, d.action === "mark", "admin");
const after = await c.readFounding(who.uid);
console.log(`written   founding: ${after.founding}${after.foundingSince ? ` since ${after.foundingSince}` : ""}`);

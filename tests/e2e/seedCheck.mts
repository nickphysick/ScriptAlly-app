/**
 * SEED, THEN RECALCULATE: NO STATUS MAY CHANGE (clean-up pass, 28 Sep). Run after `node tests/e2e/seed.mjs`.
 * For every query the seeder writes (`seed-query-N`, `seed-cal-*-q`), the app's own derivation over its
 * log — exactly what a recalculation would write — must produce the status the document states. It also
 * counts the empty logs (must be 0) and reports any stored stage date a recalculation would change.
 *
 *   npx tsx tests/e2e/seedCheck.mts          exits 1 on any status that would change
 */
import { collection, getDocs } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { computeRecomputedFields } from "../../src/lib/recomputeFields";

const { db, uid } = await harnessDb();
const seeded = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => /^seed-query-\d+$|^seed-cal-.*-q$/.test(d.id));
const moved: string[] = []; const empty: string[] = []; const dateShifts: string[] = [];
const day = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : null);
for (const q of seeded) {
  const log = (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs.map((d) => ({ id: d.id, data: d.data() }));
  if (!log.length) empty.push(q.id);
  const f = computeRecomputedFields(log);
  const s = q.data();
  if (f.status !== s.status) moved.push(`${q.id}: ${s.status} → ${f.status}`);
  for (const k of ["partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate"] as const) {
    if (s[k] && day(s[k]) !== day(f[k])) dateShifts.push(`${q.id}.${k}: ${s[k]} → ${f[k]}`);
  }
}
console.log(JSON.stringify({ seededQueries: seeded.length, emptyLogs: empty, statusWouldChange: moved, stageDateWouldChange: dateShifts }, null, 1));
if (!seeded.length) { console.error("found no seeded queries — the check proved nothing"); process.exit(1); }
process.exit(moved.length || empty.length ? 1 : 0);

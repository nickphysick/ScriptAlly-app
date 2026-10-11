/**
 * IT1 · H-M1, H-M2, H-M3 — the column matcher attaches a history row to a query only when the
 * manuscript AND the agent both match (the same agent match the import uses on all three tiles).
 *
 *   M1  a manuscript with queries to two agents: a row naming agent B lands on B's query and
 *       leaves A's untouched (and a row naming A lands on A's, so the order the store lists the
 *       queries in cannot make it pass).
 *   M2  the same manuscript and a row naming no agent: nothing is written; the row is in the run's
 *       log, the "Not imported" count and the dashboard's skipped-rows notice.
 *   M3  a manuscript with one query and a row naming no agent: it attaches, as before.
 *
 * The runs build their own manuscripts, agents and queries on the harness account through the
 * matcher itself, and everything is removed in a `finally`; the account's document ids are proved
 * equal to the snapshot taken before.
 * Mutations (source, rebuilt): match by title alone (M1); attach to the first query (M2).
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, getDocs, type Firestore } from "firebase/firestore";
import { openMatcher, runMatcher, readRun, snapshot, cleanup, type Kind } from "./matcherDrive";
import { devDb } from "./devWrite";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.setTimeout(600_000);
const OUT = resolve(process.cwd(), "reports/import-truth");
const record = (name: string, value: unknown) => { mkdirSync(OUT, { recursive: true }); appendFileSync(resolve(OUT, "matcher-history-readings.jsonl"), JSON.stringify({ name, value }) + "\n"); };

const TWO = "History Probe Pair";   // a manuscript with queries to two agents
const ONE = "History Probe Solo";   // a manuscript with one query
const A = "Probe Agent Alder";
const B = "Probe Agent Birch";

async function run(page: Page, kind: Kind, csv: string) {
  await openMatcher(page, kind);
  await runMatcher(page, csv);
  return readRun(page);
}
/** Every feed row and every history step, keyed by the query it belongs to. */
async function eventsByQuery(db: Firestore, uid: string, queryIds: string[]) {
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.map((d) => d.data() as Record<string, any>);
  const out: Record<string, { feed: string[]; steps: number }> = {};
  for (const id of queryIds) {
    out[id] = {
      feed: feed.filter((f) => f.queryId === id).map((f) => `${String(f.date).slice(0, 10)} ${f.description}`).sort(),
      steps: (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).size,
    };
  }
  return out;
}

test("the matcher's history rows: manuscript and agent both match, or nothing is written", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const snap = await snapshot(db, uid);
  try {
    // ── the fixture, made through the matcher: two manuscripts, two agents, three queries ──
    await run(page, "Manuscripts", `Title\n${TWO}\n${ONE}`);
    await run(page, "Agents", `Name\n${A}\n${B}`);
    const made = await run(page, "Queries", `Manuscript Title,Agent Name,State,Date Sent
${TWO},${A},Queried,2026-03-01
${TWO},${B},Queried,2026-03-02
${ONE},${A},Queried,2026-03-03`);
    expect(made.counts, "three queries were made").toContain("Imported: 3");
    const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => !snap.agents.includes(d.id)).map((d) => ({ id: d.id, name: d.data().name as string }));
    const mss = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.filter((d) => !snap.manuscripts.includes(d.id)).map((d) => ({ id: d.id, title: d.data().title as string }));
    const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !snap.queries.includes(d.id)).map((d) => ({ id: d.id, ...(d.data() as { agentId: string; manuscriptId: string }) }));
    const idOf = (ms: string, agent: string) => queries.find((q) => q.manuscriptId === mss.find((m) => m.title === ms)!.id && q.agentId === agents.find((a) => a.name === agent)!.id)!.id;
    const qA = idOf(TWO, A), qB = idOf(TWO, B), qSolo = idOf(ONE, A);
    expect(new Set([qA, qB, qSolo]).size, "three distinct queries").toBe(3);
    const before = await eventsByQuery(db, uid, [qA, qB, qSolo]);

    // ── M1 · a row naming agent B, and one naming agent A ──
    /* Two rows, one for each agent, so the claim does not rest on which query the store happens to
       list first: matched by title alone, both land on the same query, whichever it is. */
    const m1 = await run(page, "Query history", `Related Title,Agent Name,Event Type,Description,Date
${TWO},${B},Status changed,Birch asked for the first fifty pages,2026-04-10
${TWO},${A},Status changed,Alder passed,2026-04-09`);
    const afterM1 = await eventsByQuery(db, uid, [qA, qB, qSolo]);
    record("M1", { counts: m1.counts, log: m1.log, before, after: afterM1 });
    expect(m1.counts).toContain("Imported: 2");
    expect(afterM1[qB].feed, "B's event is on B's query, and only that").toEqual([...before[qB].feed, "2026-04-10 Birch asked for the first fifty pages"].sort());
    expect(afterM1[qA].feed, "A's query holds A's event, and not B's").toEqual([...before[qA].feed, "2026-04-09 Alder passed"].sort());
    expect(afterM1[qSolo], "the other manuscript's query is untouched").toEqual(before[qSolo]);

    // ── M2 · the same manuscript, a row naming no agent ──
    await page.evaluate((id) => localStorage.removeItem(`sa.importSkipped.${id}`), uid);
    const m2 = await run(page, "Query history", `Related Title,Agent Name,Event Type,Description,Date
${TWO},,Status changed,Somebody asked for the full,2026-04-11`);
    const afterM2 = await eventsByQuery(db, uid, [qA, qB, qSolo]);
    const notice = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sa.importSkipped.${id}`) ?? "null"), uid);
    record("M2", { counts: m2.counts, text: m2.text.slice(0, 700), after: afterM2, notice });
    expect(afterM2, "nothing was written to any query").toEqual(afterM1);
    expect(m2.counts).toContain("Imported: 0");
    expect(m2.counts).toContain("Not imported: 1");
    expect(m2.text, "the run's log names the row").toContain("Row 2");
    expect(notice?.count, "the row is in the skipped-rows notice").toBe(1);
    expect(notice.rows[0].status).toBe("Somebody asked for the full");
    expect(notice.rows[0].reason, "with the review's own wording for a row that names nobody").toBe("Who's this for?");

    // ── M3 · a manuscript with one query, a row naming no agent ──
    const m3 = await run(page, "Query history", `Related Title,Agent Name,Event Type,Description,Date
${ONE},,Status changed,Alder asked for the full,2026-04-12`);
    const afterM3 = await eventsByQuery(db, uid, [qA, qB, qSolo]);
    record("M3", { counts: m3.counts, log: m3.log, after: afterM3 });
    expect(m3.counts).toContain("Imported: 1");
    expect(afterM3[qSolo].feed, "it attaches to the manuscript's one query").toEqual([...afterM2[qSolo].feed, "2026-04-12 Alder asked for the full"].sort());
    expect(afterM3[qA]).toEqual(afterM2[qA]);
    expect(afterM3[qB]).toEqual(afterM2[qB]);
  } finally {
    await page.evaluate((id) => localStorage.removeItem(`sa.importSkipped.${id}`), uid).catch(() => {});
    const removed = await cleanup(db, uid, snap);
    const after = await snapshot(db, uid);
    record("cleanup", { removed, before: Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length])), after: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length])) });
    for (const k of Object.keys(snap) as (keyof typeof snap)[]) expect([...after[k]].sort(), `${k} are as they were`).toEqual([...snap[k]].sort());
  }
});

/**
 * IT1 · U3 — the column matcher never drops a row silently for want of a date (ruling 4).
 *
 * A queries sheet with one undated row: the query is written with no sent date, its history is
 * undated, and nothing in it is dated to the moment of the import. Then a history sheet with one
 * row whose date cannot be read: the event is not written, the run says so, and the row is in the
 * dashboard's skipped-rows notice with the review's own date reason.
 * (The matcher takes one kind of sheet per run, so the two rows arrive in two runs.)
 *
 * Everything the runs created is removed in a `finally`, and the account's document ids are
 * proved equal to the snapshot taken before.
 * Mutation (source, rebuilt): skip a query row with no readable date.
 */
import { test, expect } from "@playwright/test";
import { collection, getDocs } from "firebase/firestore";
import { openMatcher, runMatcher, readRun, snapshot, cleanup } from "./matcherDrive";
import { devDb } from "./devWrite";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.setTimeout(420_000);
const OUT = resolve(process.cwd(), "reports/import-truth");
const record = (name: string, value: unknown) => { mkdirSync(OUT, { recursive: true }); appendFileSync(resolve(OUT, "matcher-undated-readings.jsonl"), JSON.stringify({ name, value }) + "\n"); };

test("U3 · an undated query row is imported undated; an undated history row is listed in the notice", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const snap = await snapshot(db, uid);
  const startedAt = Date.now();
  try {
    /* Re-pointed (the history match): a history row now attaches only when its manuscript AND its
       agent match, so the agent is put on the contact list first and the history row names them.
       Before, the row went to the first query on "The Smoke Test" — another agent's. */
    await openMatcher(page, "Agents");
    await runMatcher(page, `Name\nUndated Probe Agent`);

    // ── 1 · a queries sheet: one row, no date ──
    await openMatcher(page, "Queries");
    await runMatcher(page, `Manuscript Title,Agent Name,State,Date Sent
The Smoke Test,Undated Probe Agent,Partial Requested,`);
    const run1 = await readRun(page);
    const fresh = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !snap.queries.includes(d.id));
    expect(fresh.length, "the undated query row was imported").toBe(1);
    const q = fresh[0].data() as Record<string, unknown>;
    const steps = (await getDocs(collection(db, "users", uid, "queries", fresh[0].id, "activity"))).docs.map((d) => d.data() as Record<string, any>);
    record("query", { counts: run1.counts, log: run1.log, stored: { status: q.status, dateSent: q.dateSent ?? null, lastStatusChange: q.lastStatusChange ?? null }, steps: steps.map((s) => ({ status: s.resultingStatus, provisional: s.dateProvisional === true, ms: s.createdAt?.toMillis?.() })) });
    expect(run1.log.some((l) => l.startsWith('Added query: "The Smoke Test" to Undated Probe Agent')), "the run says it was added").toBe(true);
    expect(run1.counts).toContain("Imported: 1");
    expect(run1.counts, "the agent is on the list, so the row needs no decision").toContain("Need a decision: 0");
    expect("dateSent" in q, "no sent date was written").toBe(false);
    expect(q.status).toBe("Partial Requested");
    expect(q.partialRequestedDate ?? null, "no stage date was written").toBeNull();
    expect(steps.length, "its history was written").toBeGreaterThanOrEqual(2);
    for (const s of steps) {
      expect(s.dateProvisional, "every step is undated").toBe(true);
      expect(Math.abs((s.createdAt?.toMillis?.() ?? 0) - startedAt) > 3_600_000, "no step is dated to the import").toBe(true);
    }
    const feedAfter1 = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => !snap.activities.includes(d.id));
    expect(feedAfter1.filter((d) => d.data().queryId === fresh[0].id).length, "no feed row dated now was written for it").toBe(0);

    // ── 2 · a history sheet: one row, a date that cannot be read ──
    await openMatcher(page, "Query history");
    await runMatcher(page, `Related Title,Agent Name,Event Type,Description,Date
The Smoke Test,Undated Probe Agent,Status changed,Asked for the first fifty pages,sometime in May`);
    const run2 = await readRun(page);
    const notice = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sa.importSkipped.${id}`) ?? "null"), uid);
    const feedAfter2 = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => !snap.activities.includes(d.id));
    record("history", { counts: run2.counts, text: run2.text.slice(0, 600), notice, feedRowsWritten: feedAfter2.length });
    expect(feedAfter2.filter((d) => d.data().queryId === fresh[0].id).length, "the event was not written").toBe(0);
    expect(run2.counts).toContain("Not imported: 1");
    expect(run2.text, "the run says why").toContain("Row 2 has no date that could be read");
    expect(notice?.count, "the row is in the skipped-rows notice").toBe(1);
    expect(notice.rows).toHaveLength(1);
    expect(notice.rows[0].reason, "with the review's own date reason").toBe("Date needed");
    expect(notice.rows[0].status).toBe("Asked for the first fifty pages");
    expect(notice.rows[0].who, "it names the agent of the query the row matched").toBe("Undated Probe Agent");
    expect(notice.rows[0].sentDate).toBeNull();

    // ── and the dashboard shows it, reached without a reload ──
    await page.getByRole("button", { name: /^Dashboard$/ }).first().click();
    const line = page.locator('.os-root.d58:not(.is-ghost) [data-d58="notice"]').first();
    await line.waitFor({ state: "visible", timeout: 30_000 });
    const text = ((await line.textContent()) ?? "").replace(/\s+/g, " ");
    record("dashboardNotice", text);
    expect(text).toContain("1 row from your file wasn't imported.");
  } finally {
    await page.evaluate((id) => localStorage.removeItem(`sa.importSkipped.${id}`), uid).catch(() => {});
    const removed = await cleanup(db, uid, snap);
    const after = await snapshot(db, uid);
    record("cleanup", { removed, before: Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length])), after: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length])) });
    for (const k of Object.keys(snap) as (keyof typeof snap)[]) expect([...after[k]].sort(), `${k} are as they were`).toEqual([...snap[k]].sort());
  }
});

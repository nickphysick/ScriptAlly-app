/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "IT NEVER HAPPENED" LEAVES NOTHING BEHIND (fix-delete-entry, option 1: clear only).
 *
 * D1 · for each entry type — a response (a pass), a request, a send, a nudge, an offer, a close — the entry is
 *      written on a clean query of its own THROUGH ITS JOURNEY, deleted from the timeline ("It never happened"),
 *      and the query document must equal its starting snapshot FIELD FOR FIELD, with no feed row, log entry,
 *      task or task flag left over.
 * D2 · THE KNOWN LIMIT. Where the deleted entry wrote OVER an earlier value (a second request's send-by date
 *      over the first's), the earlier value is not restored: nothing recorded it. The field then holds the
 *      deleted entry's value or is cleared — never a third value. (Restoring it is option 2:
 *      reports/fix-delete-entry/OPTION-2.md.)
 *
 * TIMESTAMPS EXCEPTED, BY NAME: none. Every field `recomputeQuery` writes is derived from the log, and the log
 * is back to its starting entries, so even `lastStatusChange` and `responseReceivedAt` must come back exactly.
 *
 * Red first: `FDE_MUTATE=D1` sets `window.__SA_SKIP_ENTRY_CLEAR` (a development-build switch in
 * lib/entryDeleteWrite) before the delete, which skips the journey-field clear — the
 * behaviour before the fix. `FDE_MUTATE=FEED` sets `__SA_SKIP_FEED_MATCH`: the feed row is looked for under the
 * log entry's own id, as before, so a response's row is left. reports/fix-delete-entry/mutation-D1.txt, -FEED.txt.
 *
 * ⚠️ IT WRITES, on documents of its own (tests/e2e/seedDeleteEntry.mjs, the `fde-` prefix, a manuscript of
 *    their own), re-seeded before each case and removed at the end of the run.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/fix-delete-entry";
const MUT = process.env.FDE_MUTATE ?? "";
const QID = "fde-q";
const ROW = `[data-qcv="row"][data-qid="${QID}"]`;
const CARD = '[data-qcv="qm-card"], [data-qp="panel"]';
type Dump = { query: Record<string, unknown> | null; log: { id: string; type?: string }[]; feed: { id: string; logEntryId?: string }[]; flags: string[]; tasks: string[]; marked: string[] };
const seed = (c: string) => execSync(`node tests/e2e/seedDeleteEntry.mjs ${c}`, { stdio: "inherit" });
const dump = (): Dump => JSON.parse(execSync("node tests/e2e/seedDeleteEntry.mjs --dump", { encoding: "utf8" }).trim().split("\n").pop()!);
const ids = (x: { id: string }[]) => x.map((e) => e.id).sort().join();
const show = (v: unknown) => (v === undefined ? "absent" : JSON.stringify(v));
/** every field that differs between two query documents */
const diff = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => `${k}: ${show(a[k])} → ${show(b[k])}`);

type Row = { lock: string; where: string; ok: boolean; detail: string };
const rows: Row[] = [];
const check = (lock: string, where: string, ok: unknown, detail: string) => { rows.push({ lock, where, ok: !!ok, detail }); if (!ok) console.log(`  ✗ ${lock} · ${where} — ${detail}`); };
const done = (name: string, from: number, floor: number) => {
  const mine = rows.slice(from);
  mkdirSync(`${DIR}/ledger`, { recursive: true });
  writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${name}.json`, JSON.stringify(mine, null, 1));
  console.log(`[${name}] ${mine.filter((r) => r.ok).length}/${mine.length} green`);
  expect(mine.length, `${name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
  expect(mine.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
};

async function open(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "fde-ms"); for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", { width: 1512, height: 900 });
  await expect(page.locator(ROW).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}
/** Write one entry through its journey: open the drawer, give the answers, press the primary to the end. */
async function journey(page: Page, mode: string, picks: (string | RegExp)[]) {
  await page.evaluate(({ m, q }) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open({ mode: m, queryId: q }), { m: mode, q: QID });
  const d = page.locator("[data-qad-drawer]:visible").first();
  await expect(d).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
  const left = [...picks];
  for (let i = 0; i < 12; i++) {
    if (!(await d.isVisible().catch(() => false))) return;
    const p = d.locator("[data-qad-primary]");
    if (!(await p.count())) return;
    if (await p.isDisabled()) {
      const pick = left.shift();
      if (!pick) throw new Error(`${mode}: the primary is disabled and no answer is left to give — "${(await d.innerText()).replace(/\s+/g, " ").slice(0, 300)}"`);
      await d.locator("button", { hasText: pick }).first().click();
      await page.waitForTimeout(450);
      continue;
    }
    /* an answer that is offered on this step, though the primary is already live */
    if (left.length && (await d.locator("button", { hasText: left[0] }).count())) { await d.locator("button", { hasText: left.shift()! }).first().click(); await page.waitForTimeout(450); continue; }
    const label = (await p.innerText()).trim();
    await p.click();
    await page.waitForTimeout(650);
    if (!/^Next/.test(label)) return;
  }
  throw new Error(`${mode}: the journey did not reach its save`);
}
const until = async (what: string, f: (d: Dump) => boolean): Promise<Dump> => {
  let d = dump();
  for (let i = 0; i < 12 && !f(d); i++) { await new Promise((r) => setTimeout(r, 1500)); d = dump(); }
  expect(f(d), what).toBe(true);
  return d;
};
/** Delete the newest entry from the query's timeline: ⋯, "It never happened", Delete. */
async function deleteNewest(page: Page, heading: RegExp) {
  await open(page);
  if (MUT === "D1") await page.evaluate(() => { (window as unknown as { __SA_SKIP_ENTRY_CLEAR: boolean }).__SA_SKIP_ENTRY_CLEAR = true; });
  if (MUT === "FEED") await page.evaluate(() => { (window as unknown as { __SA_SKIP_FEED_MATCH: boolean }).__SA_SKIP_FEED_MATCH = true; });
  await page.locator(`${ROW} [data-qcv="row-agent"], ${ROW} .qcw-agt`).first().click();
  const card = page.locator(CARD).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  /* the entry just written, by its title on the timeline (the timeline is oldest first, and a nudge is drawn inside its stage) */
  const ev = card.locator(".tl-ev").filter({ has: page.locator(".tl-ttl", { hasText: heading }) }).last();
  await expect(ev, `no timeline entry titled ${heading}`).toBeVisible({ timeout: 15_000 });
  await ev.locator(".tl-more").click();
  await page.locator(".cor-branch", { hasText: /It never happened/ }).first().click();
  await page.locator('[data-qcv="entry-del-go"]').first().click();
}

/** the six entry types: the fixture each starts from, the journey that writes it, and how the timeline names it */
const CASES: { type: string; fixture: string; mode: string; picks: (string | RegExp)[]; heading: RegExp; status: string }[] = [
  { type: "response (a pass)", fixture: "queried", mode: "resp", picks: [/^Pass$/], heading: /rejected|pass/i, status: "Rejected" },
  { type: "request", fixture: "queried", mode: "resp", picks: [/^Full requested$/], heading: /^Full requested/i, status: "Full Requested" },
  { type: "send", fixture: "fullreq", mode: "sent", picks: [], heading: /full.*sent|sent.*full/i, status: "Full Sent" },
  { type: "nudge", fixture: "queried", mode: "nudge", picks: [/I.ve sent a nudge/], heading: /nudge/i, status: "Queried" },
  { type: "offer", fixture: "queried", mode: "resp", picks: [/^Offer$/], heading: /^Offer/i, status: "Offer" },
  { type: "close", fixture: "queried", mode: "close", picks: [/I.m withdrawing/], heading: /withdr|closed/i, status: "Withdrawn" },
];

test.describe("delete entry", () => {
  test.afterAll(() => { execSync("node tests/e2e/seedDeleteEntry.mjs --clean", { stdio: "inherit" }); });

  for (const c of CASES) {
    test(`D1 · ${c.type}: written, deleted, and the query is its starting snapshot again`, async ({ page }) => {
      test.setTimeout(420_000);
      const from = rows.length; const w = c.type;
      seed(c.fixture);
      const before = dump();
      await open(page);
      await journey(page, c.mode, c.picks);
      const mid = await until(`${w}: the journey wrote its entry`, (d) => d.log.length === before.log.length + 1 && d.query?.status === c.status);
      check("D1", `${w} · the write happened`, mid.query?.status === c.status && mid.feed.length === before.feed.length + 1, `status ${mid.query?.status}; log ${before.log.length} → ${mid.log.length}; feed ${before.feed.length} → ${mid.feed.length}`);
      const wrote = diff(before.query!, mid.query!);
      console.log(`  ${w} wrote: ${wrote.join(" · ")}`);
      const newRow = mid.feed.find((f) => !before.feed.some((b) => b.id === f.id));
      const newLog = mid.log.find((l) => !before.log.some((b) => b.id === l.id));
      check("D1", `${w} · the new feed row names its log entry`, !!newRow && !!newLog && (newRow.logEntryId === newLog.id || newRow.id === newLog.id), `row ${newRow?.id} · logEntryId ${show(newRow?.logEntryId)} · log entry ${newLog?.id}`);
      await deleteNewest(page, c.heading);
      await until(`${w}: the entry left the log`, (d) => d.log.length === before.log.length);
      await page.waitForTimeout(5000);
      const end = dump();
      const left = diff(before.query!, end.query!);
      check("D1", `${w} · the query document equals its starting snapshot, field for field`, left.length === 0, left.length ? left.join(" · ") : `${Object.keys(end.query!).length} fields, all as they started`);
      check("D1", `${w} · no feed row remains`, ids(end.feed) === ids(before.feed), `${ids(before.feed)} → ${ids(end.feed)}`);
      check("D1", `${w} · the log is its starting entries`, ids(end.log) === ids(before.log), `${ids(before.log)} → ${ids(end.log)}`);
      check("D1", `${w} · no task, task flag or mark on another query is left`, end.flags.join() === before.flags.join() && end.tasks.join() === before.tasks.join() && end.marked.join() === before.marked.join(), `flags [${end.flags}] · tasks [${end.tasks}] · marked [${end.marked}]`);
      done(`D1-${c.type.replace(/\W+/g, "-")}`, from, 6);
    });
  }

  test("D2 · the known limit: a value the deleted entry wrote over is not restored — it is the entry's value or cleared, never a third", async ({ page }) => {
    test.setTimeout(420_000);
    const from = rows.length;
    seed("overwrite");
    const before = dump();
    const FIELDS = ["expectedSendDate", "sendReminderDate"];
    await open(page);
    await journey(page, "resp", [/^Full requested$/]);
    const mid = await until("D2: the second request was written", (d) => d.log.length === before.log.length + 1 && d.query?.status === "Full Requested");
    check("D2", "the second request wrote over the first's send-by date", mid.query?.status === "Full Requested" && FIELDS.some((f) => JSON.stringify(mid.query![f]) !== JSON.stringify(before.query![f])), FIELDS.map((f) => `${f}: ${show(before.query![f])} → ${show(mid.query![f])}`).join(" · "));
    await deleteNewest(page, /^Full requested/i);
    await until("D2: the entry left the log", (d) => d.log.length === before.log.length);
    await page.waitForTimeout(5000);
    const end = dump();
    check("D2", "the status is the first request's again", end.query?.status === "Partial Requested", `${end.query?.status}`);
    for (const f of FIELDS) {
      const v = JSON.stringify(end.query![f]);
      const entrys = v === JSON.stringify(mid.query![f]); const cleared = end.query![f] === undefined; const restored = v === JSON.stringify(before.query![f]);
      check("D2", `${f} holds the deleted entry's value or is cleared, never a third value`, entrys || cleared, `started ${show(before.query![f])} · the entry wrote ${show(mid.query![f])} · after the delete ${show(end.query![f])}`);
      console.log(`  D2 ${f}: ${cleared ? "cleared" : entrys ? "holds the deleted entry's value" : restored ? "RESTORED" : "A THIRD VALUE"} (known limit: the earlier value ${show(before.query![f])} is not put back)`);
    }
    const other = diff(before.query!, end.query!).filter((d) => !FIELDS.some((f) => d.startsWith(`${f}:`)));
    check("D2", "every other field is as it started", other.length === 0, other.join(" · ") || "none differ");
    check("D2", "no feed row remains", ids(end.feed) === ids(before.feed), `${ids(before.feed)} → ${ids(end.feed)}`);
    done("D2", from, 5);
  });
});

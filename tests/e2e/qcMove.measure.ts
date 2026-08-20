/**
 * §B4 · THE MOVE, MEASURED ON BOTH QUERIES.
 *
 * ⚠️ EVERY ASSERTION IS ON THE DOCUMENTS. A move changes two histories, and both are rebuilt from
 * derived state on screen — so "the entry appears over there now" would be satisfied by a write
 * that put the feed twin in the wrong place, left the manuscript behind, or recomputed only one
 * side. `harnessDocs.ts` reads both queries directly.
 *
 *   npx playwright test --project=measure qcMove
 */
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { snapshotQuery, stable, type QuerySnapshot } from "./harnessDocs";

/**
 * ⚠️ EVERY CHECK RE-SEEDS, because a move is destructive and these checks are not independent
 * otherwise. Run in sequence without this, the second check found the first had already moved the
 * entry it needed and reported a failure about the app; the third then timed out waiting for a
 * picker that could not open. Order-dependence in a destructive suite reads as a product fault.
 */
test.beforeEach(() => { execFileSync("node", ["tests/e2e/seedCorrection.mjs"], { stdio: "ignore" }); });

/**
 * Open the move sheet for the last correctable entry and return what the two blocks CLAIM.
 * ⚠️ The claim is read out of the sheet, so the comparison afterwards is against the sheet's own
 * words rather than against something the test decided the sheet ought to say.
 */
const runMove = async (page: any, search: string): Promise<{ source: string | null; target: string | null }> => {
  expect(await openMove(page), "the fork offered no move branch").toBe(true);
  await page.locator(".cor-search").fill(search);
  await page.waitForTimeout(400);
  await page.locator(".cor-pick").first().click();
  await page.waitForTimeout(1800);
  const blocks = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".cor-mvblock")).map((b) => ({
      rows: Array.from(b.querySelectorAll(".cor-ledrow")).map((r) => (r.textContent || "").replace(/\s+/g, " ").trim()),
    })));
  expect(blocks.length, "the sheet did not show two consequence blocks").toBe(2);
  const claimed = (rows: string[]): string | null => {
    const r = rows.find((x) => /^Status/i.test(x));
    const m = r?.match(/Status\s*(.+?)\s*→\s*(.+)$/);
    return m ? m[2].trim() : null;
  };
  return { source: claimed(blocks[0].rows), target: claimed(blocks[1].rows) };
};

const commitAndWaitUndo = async (page: any) => {
  await page.locator(".cor-act").first().click();
  await page.locator(".sa-toast-undo").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
};

const openSeeded = async (page: any, queryId: string): Promise<number> => {
  await openRoute(page, `/queries?q=${queryId}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2000);
  return page.locator(".tl-more").count();
};

const diffReport = (a: QuerySnapshot, b: QuerySnapshot): string[] => {
  const out: string[] = [];
  for (const k of Object.keys({ ...a.query, ...b.query }))
    if (stable((a.query as any)[k]) !== stable((b.query as any)[k]))
      out.push(`query.${k}: ${stable((a.query as any)[k])} → ${stable((b.query as any)[k])}`);
  for (const store of ["log", "feed"] as const) {
    for (const id of new Set([...Object.keys(a[store]), ...Object.keys(b[store])])) {
      const x = a[store][id], y = b[store][id];
      if (!x) { out.push(`${store}.${id}: absent before, present after`); continue; }
      if (!y) { out.push(`${store}.${id}: present before, absent after`); continue; }
      for (const k of Object.keys({ ...x, ...y }))
        if (stable((x as any)[k]) !== stable((y as any)[k]))
          out.push(`${store}.${id}.${k}: ${stable((x as any)[k])} → ${stable((y as any)[k])}`);
    }
  }
  return out;
};

/** Open the ⋯ on the LAST entry and take the fork's move branch. */
const openMove = async (page: any): Promise<boolean> => {
  const dots = page.locator(".tl-more");
  for (let i = (await dots.count()) - 1; i >= 0; i--) {
    await dots.nth(i).click();
    await page.waitForTimeout(340);
    const edit = page.locator("[role=menuitem], .f12-menuitem", { hasText: /^Edit$/ }).first();
    if (!(await edit.count())) { await page.keyboard.press("Escape"); continue; }
    await edit.click();
    await page.waitForTimeout(450);
    const move = page.locator(".cor-branch", { hasText: /different query/i });
    if (!(await move.count())) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); continue; }
    await move.first().click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
};

test("B4·1+2 · move, both sides match the preview; undo restores both", async ({ page }) => {
  test.setTimeout(300000);
  expect(await openSeeded(page, "cor-move-a"), "cor-move-a has no correctable entries").toBeGreaterThan(0);

  /* the picker shows every destination WITH its status, so a nonsensical landing shows before choosing */
  expect(await openMove(page), "the fork offered no move branch").toBe(true);
  const rows = await page.locator(".cor-pick").allTextContents();
  console.log(`  the picker offered ${rows.length} destinations, e.g. "${(rows[0] || "").replace(/\s+/g, " ").trim()}"`);
  expect(rows.length, "the picker listed nothing").toBeGreaterThan(0);
  expect(await page.locator(".cor-pickst").count(), "destinations carry no status").toBeGreaterThan(0);
  await page.locator(".cor-search").fill("Priya");
  await page.waitForTimeout(400);
  console.log(`  filtered to ${await page.locator(".cor-pick").count()}`);
  await page.locator(".cor-pick").first().click();
  await page.waitForTimeout(1600);

  /**
   * ⚠️ A WARM-UP CYCLE FIRST, for the same reason §A needs one: the seeder writes base fields and
   * never runs the derivation, so BOTH queries start with no derived fields at all. A comparison
   * spanning the first correction reports `hasAgentResponded`, `lastStatusChange` and the rest as
   * `undefined` → set, which is the derivation healing a stale document and looks exactly like an
   * undo writing things it should not.
   */
  await commitAndWaitUndo(page);
  await page.locator(".sa-toast-undo").first().click();
  await page.waitForTimeout(6000);
  console.log("  warm-up move + undo complete — both queries now in their steady state");

  const srcBefore = await snapshotQuery("cor-move-a");
  const tgtBefore = await snapshotQuery("cor-move-b");
  console.log(`  before · source ${srcBefore.query.status} log=${Object.keys(srcBefore.log).length} · target ${tgtBefore.query.status} log=${Object.keys(tgtBefore.log).length}`);
  expect(Object.keys(srcBefore.log).length, "the warm-up did not restore the source").toBe(2);

  const claim = await runMove(page, "Priya");
  console.log(`  PREVIEW claims · source → ${claim.source ?? "(unchanged)"} · target → ${claim.target ?? "(unchanged)"}`);
  await commitAndWaitUndo(page);

  const srcAfter = await snapshotQuery("cor-move-a");
  const tgtAfter = await snapshotQuery("cor-move-b");
  console.log(`  OUTCOME · source ${srcAfter.query.status} log=${Object.keys(srcAfter.log).length} · target ${tgtAfter.query.status} log=${Object.keys(tgtAfter.log).length}`);

  expect(Object.keys(srcAfter.log).length, "the entry did not leave the source").toBe(Object.keys(srcBefore.log).length - 1);
  expect(Object.keys(tgtAfter.log).length, "the entry did not arrive at the target").toBe(Object.keys(tgtBefore.log).length + 1);

  /* ⚠️ THE FEED TWIN MOVED WITH IT — the two-store divergence, one field deep. */
  const movedId = Object.keys(srcBefore.log).find((id) => !(id in srcAfter.log))!;
  console.log(`  moved entry: ${movedId} · feed twin on target: ${movedId in tgtAfter.feed} · still on source: ${movedId in srcAfter.feed}`);
  expect(movedId in tgtAfter.feed, "the feed twin did not follow the entry").toBe(true);
  expect(movedId in srcAfter.feed, "the feed twin is still filed under the source").toBe(false);

  if (claim.source) expect(String(srcAfter.query.status), "PREVIEW DIVERGED FROM OUTCOME on the SOURCE").toBe(claim.source);
  if (claim.target) expect(String(tgtAfter.query.status), "PREVIEW DIVERGED FROM OUTCOME on the TARGET").toBe(claim.target);

  /* B4·2 — one undo, both queries, asserted on the documents */
  await page.locator(".sa-toast-undo").first().click();
  await page.waitForTimeout(6000);
  const d1 = diffReport(srcBefore, await snapshotQuery("cor-move-a"));
  const d2 = diffReport(tgtBefore, await snapshotQuery("cor-move-b"));
  if (d1.length) console.log(`  ⚠️ SOURCE DIFFERENCES: ${d1.join(" | ")}`);
  if (d2.length) console.log(`  ⚠️ TARGET DIFFERENCES: ${d2.join(" | ")}`);
  expect(d1, "one undo did not restore the SOURCE").toEqual([]);
  expect(d2, "one undo did not restore the TARGET").toEqual([]);
});

test("B4·3 · a closed target stays closed, and the entry lands in its place", async ({ page }) => {
  test.setTimeout(240000);
  const tgtBefore = await snapshotQuery("cor-move-c");
  expect(tgtBefore.query.status, "seed missing").toBe("Rejected");

  expect(await openSeeded(page, "cor-move-a"), "cor-move-a has no correctable entries").toBeGreaterThan(0);
  expect(await openMove(page), "the fork offered no move branch").toBe(true);
  await page.locator(".cor-search").fill("Joan");
  await page.waitForTimeout(400);
  const closedRow = page.locator(".cor-pick--closed");
  console.log(`  closed destinations listed (not hidden, not disabled): ${await closedRow.count()}`);
  expect(await closedRow.count(), "the closed query was hidden from the picker").toBeGreaterThan(0);
  await closedRow.first().click();
  await page.waitForTimeout(1800);

  const notice = (await page.locator(".cor-notice").first().textContent()) || "";
  console.log(`  the sheet stated: ${notice.replace(/\s+/g, " ").trim()}`);
  expect(notice, "no closed-target notice").toMatch(/is closed/i);
  expect(notice, "the notice guessed the agent's pronoun").not.toMatch(/\b(she|he|her|his|him|hers)\b/i);
  const acts = await page.locator(".cor-act b").allTextContents();
  console.log(`  it offered: ${acts.join(" / ")}`);
  expect(acts.some((a) => /reopen/i.test(a)), "no reopen-first offer on a closed target").toBe(true);

  /**
   * ⚠️ THE PREVIEW IS READ HERE TOO. Card 11's promise is that the sheet tells the truth even when
   * it surprises — so what it CLAIMS about the closed query is compared with what that query
   * becomes, exactly as on the open-target path.
   */
  const blocks = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".cor-mvblock")).map((b) =>
      Array.from(b.querySelectorAll(".cor-ledrow")).map((r) => (r.textContent || "").replace(/\s+/g, " ").trim())));
  const tgtRow = blocks[1]?.find((x: string) => /^Status/i.test(x));
  console.log(`  the target block claims: ${tgtRow ?? "(no status change)"}`);

  await page.locator(".cor-act").first().click();
  await page.waitForTimeout(6000);
  const tgtAfter = await snapshotQuery("cor-move-c");
  console.log(`  target status after the move: ${tgtAfter.query.status}`);
  /* ⚠️ AN EVENT DATED BEFORE THE CLOSURE DOES NOT REOPEN IT (card 11) — and the sheet must have
     said as much, i.e. claimed no status change at all. */
  expect(tgtRow, "the sheet claimed a status change on a query that should stay closed").toBeUndefined();
  expect(tgtAfter.query.status, "moving an earlier event onto a closed query reopened it").toBe("Rejected");
  expect(Object.keys(tgtAfter.log).length, "the entry did not land").toBe(Object.keys(tgtBefore.log).length + 1);

  const undo = page.locator(".sa-toast-undo").first();
  if (await undo.count()) { await undo.click(); await page.waitForTimeout(6000); }
  console.log(`  restored to ${Object.keys((await snapshotQuery("cor-move-c")).log).length} entries`);
});

test("B4·4 · a note naming the source's agent is flagged before it travels", async ({ page }) => {
  test.setTimeout(240000);
  expect(await openSeeded(page, "cor-move-a"), "cor-move-a has no correctable entries").toBeGreaterThan(0);
  expect(await openMove(page), "the fork offered no move branch").toBe(true);
  await page.locator(".cor-search").fill("Priya");
  await page.waitForTimeout(400);
  await page.locator(".cor-pick").first().click();
  await page.waitForTimeout(1800);

  /* the seed's note reads "Marcus asked for the first fifty pages." on Marcus Reed's query */
  const warn = page.locator(".cor-notice--warn");
  console.log(`  stale-note flags: ${await warn.count()}`);
  expect(await warn.count(), "the note naming the source agent was not flagged").toBeGreaterThan(0);
  console.log(`  it said: ${((await warn.first().textContent()) || "").replace(/\s+/g, " ").trim()}`);

  /* ⚠️ THE NOTE IS EDITABLE IN THE SHEET — sending the writer back to the edit form would lose the
     move they had already set up. */
  expect(await page.locator("#cor-mvnote").count(), "the flagged note is not editable here").toBe(1);
  const acts = await page.locator(".cor-act b").allTextContents();
  console.log(`  it offered: ${acts.join(" / ")}`);
  expect(acts.some((a) => /clear the note/i.test(a)), "no move-and-clear offer (card 10)").toBe(true);
});

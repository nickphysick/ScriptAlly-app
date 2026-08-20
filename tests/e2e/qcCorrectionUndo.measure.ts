/**
 * §A · THE UNDO, ASSERTED ON THE DOCUMENTS.
 *
 * ⚠️ THIS IS THE PACK'S ONE UNVERIFIED CLAIM, and it is where the empty-closure fault was found —
 * a toast that offered UNDO and would have restored nothing while telling the writer it had. So the
 * assertion is deliberately not "the rows came back": it is that every document in both stores, and
 * the derived fields on the query, are byte-identical to the snapshot taken before the removal.
 *
 *   npx playwright test --project=measure qcCorrectionUndo
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { snapshotQuery, stable, type QuerySnapshot } from "./harnessDocs";

/**
 * ⚠️ THE QUERY IS ADDRESSED BY ID, NEVER BY AGENT NAME. `seed.mjs` assigns its twenty queries to
 * agents round-robin, so "Tom Ellery" names a seeded shape AND several general queries that carry
 * no activity documents at all — and picking the first matching row landed on one of those, which
 * then reported "no removable entry" about a query that has three. `/queries?q=<id>` is the
 * page's own deep-selection and cannot pick the wrong one.
 */
const openSeeded = async (page: any, queryId: string): Promise<boolean> => {
  await openRoute(page, `/queries?q=${queryId}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2000);
  return (await page.locator(".tl-more").count()) > 0;
};

const menuDelete = async (page: any, index: number): Promise<boolean> => {
  const dots = page.locator(".tl-more");
  if (index >= (await dots.count())) return false;
  await dots.nth(index).click();
  await page.waitForTimeout(340);
  const del = page.locator("[role=menuitem], .f12-menuitem", { hasText: /Delete/i }).first();
  if (!(await del.count())) { await page.keyboard.press("Escape"); return false; }
  await del.click();
  await page.waitForTimeout(900);
  return (await page.locator(".cor-act").count()) > 0;
};

/** ⚠️ NAMES THE FIRST FIELD THAT DIFFERS, so a failure is diagnosable without a second run. */
const diffReport = (a: QuerySnapshot, b: QuerySnapshot): string[] => {
  const out: string[] = [];
  for (const k of Object.keys({ ...a.query, ...b.query })) {
    if (stable((a.query as any)[k]) !== stable((b.query as any)[k]))
      out.push(`query.${k}: ${stable((a.query as any)[k])} → ${stable((b.query as any)[k])}`);
  }
  for (const store of ["log", "feed"] as const) {
    const ids = new Set([...Object.keys(a[store]), ...Object.keys(b[store])]);
    for (const id of ids) {
      const x = a[store][id], y = b[store][id];
      if (!x) { out.push(`${store}.${id}: ABSENT before, present after`); continue; }
      if (!y) { out.push(`${store}.${id}: present before, ABSENT after`); continue; }
      for (const k of Object.keys({ ...x, ...y })) {
        if (stable((x as any)[k]) !== stable((y as any)[k]))
          out.push(`${store}.${id}.${k}: ${stable((x as any)[k])} → ${stable((y as any)[k])}`);
      }
    }
  }
  return out;
};

test("A2·1 · remove both, then undo restores both stores byte-identically", async ({ page }) => {
  test.setTimeout(180000);
  expect(await openSeeded(page, "cor-pair"), "cor-pair has no correctable entries — run seedCorrection.mjs").toBe(true);

  /**
   * ⚠️ ONE CYCLE IS RUN BEFORE THE MEASUREMENT, AND IT IS NOT PADDING. The seeder writes base
   * fields only; it never runs the derivation, so a freshly seeded query carries NO derived fields
   * at all. The first correction recomputes them, and a comparison spanning that moment reports
   * six differences — `partialSentDate`, `hasAgentResponded`, `lastStatusChange` and the rest all
   * `undefined` → set — which look exactly like an undo writing things it should not.
   *
   * They are the derivation HEALING A STALE DOCUMENT, which is correct behaviour and the first
   * reading of this check accused the undo of it. So the warm-up puts the query into the steady
   * state the app maintains, and the measured cycle then compares like with like.
   */
  const cycle = async (): Promise<{ cascade: boolean; removed: number }> => {
    let opened = false;
    for (let i = 0; i < (await page.locator(".tl-more").count()) && !opened; i++) {
      opened = await menuDelete(page, i);
      if (!opened) { await page.keyboard.press("Escape"); await page.waitForTimeout(250);
        const c = page.locator("button", { hasText: /^Close$/ }).first();
        if (await c.count()) { await c.click(); await page.waitForTimeout(220); } }
    }
    expect(opened, "no entry on cor-pair raised the sheet").toBe(true);
    const both = page.locator(".cor-act", { hasText: /Remove both/i });
    const cascade = (await both.count()) > 0;
    const wasLog = Object.keys((await snapshotQuery("cor-pair")).log).length;
    await (cascade ? both.first() : page.locator(".cor-act").first()).click();
    const u = page.locator(".sa-toast-undo").first();
    await u.waitFor({ timeout: 15000 });
    const nowLog = Object.keys((await snapshotQuery("cor-pair")).log).length;
    await u.click();
    await page.waitForTimeout(5000);
    return { cascade, removed: wasLog - nowLog };
  };

  const warm = await cycle();
  console.log(`  warm-up cycle · cascade=${warm.cascade} · entries removed=${warm.removed}`);
  await page.waitForTimeout(1200);

  const before = await snapshotQuery("cor-pair");
  console.log(`  before: status=${before.query.status} · log=${Object.keys(before.log).length} · feed=${Object.keys(before.feed).length}`);
  expect(Object.keys(before.log).length, "the warm-up did not restore the seed").toBe(3);

  const offered = await page.locator(".cor-act b").allTextContents();
  void offered;
  const measured = await cycle();
  const cascade = measured.cascade;
  console.log(`  measured cycle · cascade=${cascade} · entries removed=${measured.removed}`);
  expect(measured.removed, "the removal removed nothing").toBeGreaterThan(0);
  if (cascade) expect(measured.removed, "cascade removed one, not two").toBe(2);

  const after = await snapshotQuery("cor-pair");
  const diffs = diffReport(before, after);
  console.log(`  after undo:  status=${after.query.status} · log=${Object.keys(after.log).length} · feed=${Object.keys(after.feed).length}`);
  if (diffs.length) console.log(`  ⚠️ DIFFERENCES: ${diffs.join(" | ")}`);
  expect(diffs, "UNDO DID NOT RESTORE BYTE-IDENTICALLY").toEqual([]);
});

test("A2·2 · removing a closure reopens the query", async ({ page }) => {
  test.setTimeout(180000);
  const before = await snapshotQuery("cor-closed");
  console.log(`  status before: ${before.query.status}`);
  expect(before.query.status, "seed missing — run seedCorrection.mjs").toBe("Rejected");

  expect(await openSeeded(page, "cor-closed"), "cor-closed has no correctable entries").toBe(true);

  /* the closure is the LATEST entry, so its ⋯ is the last one */
  const n = await page.locator(".tl-more").count();
  let opened = false;
  for (let i = n - 1; i >= 0 && !opened; i--) {
    opened = await menuDelete(page, i);
    if (!opened) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
  }
  expect(opened, "no removable entry on cor-closed").toBe(true);

  /* ⚠️ THE SHEET IS READ FIRST — the reopening is precisely the consequence it exists to state. */
  console.log(`  the sheet stated: ${(await page.locator(".cor-tlsum, .cor-ledrow").allTextContents()).join(" | ")}`);
  await page.locator(".cor-act").first().click();
  await page.waitForTimeout(4500);

  const after = await snapshotQuery("cor-closed");
  console.log(`  status after:  ${after.query.status}`);
  expect(after.query.status, "removing the closure left the query closed").not.toBe("Rejected");

  /* put it back, so the shape survives for the next run */
  const undo = page.locator(".sa-toast-undo").first();
  if (await undo.count()) { await undo.click(); await page.waitForTimeout(4000); }
  console.log(`  status restored to: ${(await snapshotQuery("cor-closed")).query.status}`);
});

test("A2·3 · a newer write retires a pending undo", async ({ page }) => {
  test.setTimeout(180000);
  expect(await openSeeded(page, "cor-undo"), "cor-undo has no correctable entries").toBe(true);

  /**
   * ⚠️ THE PRECONDITION IS ASSERTED, because the first version of this check did not and PASSED
   * HAVING PROVED NOTHING. It removed the query's only removable entry, found no second one, logged
   * "unexercised" and returned green — while having permanently consumed the entry it needed. A
   * check that reports success after skipping its own subject is worse than one that fails.
   *
   * ⚠️ AND THE WRITE THAT RETIRES AN UNDO IS A WRITE — so this check cannot restore itself, and
   * `seedCorrection.mjs` is a precondition of the suite rather than a convenience.
   */
  const removable = await page.locator(".tl-more").count();
  console.log(`  correctable entries on cor-undo: ${removable}`);
  expect(removable, "cor-undo needs two removable entries — re-run seedCorrection.mjs").toBeGreaterThanOrEqual(3);

  /* a correction that leaves a pending undo */
  let opened = false;
  for (let i = (await page.locator(".tl-more").count()) - 1; i >= 0 && !opened; i--) {
    opened = await menuDelete(page, i);
    if (!opened) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
  }
  expect(opened, "no removable entry on cor-move-a").toBe(true);
  await page.locator(".cor-act").first().click();
  const undo = page.locator(".sa-toast-undo").first();
  await undo.waitFor({ timeout: 15000 });
  console.log("  a pending undo is on screen");

  /**
   * ⚠️ THE NEWER WRITE GOES TO THE SAME QUERY. `undoStillValid` compares the SET of activity ids;
   * anything appended or removed since the correction retires it, because "put it back" stops being
   * truthful the moment something is built on the corrected record.
   */
  const firstMessage = ((await page.locator(".sa-toast").first().textContent()) || "")
    .replace(/UNDO|✕/g, "").replace(/\s+/g, " ").trim().slice(0, 28);
  console.log(`  the pending undo reads: "${firstMessage}"`);
  expect(firstMessage.length, "no toast text to identify the older undo by").toBeGreaterThan(3);

  const dots2 = page.locator(".tl-more");
  let second = false;
  for (let i = (await dots2.count()) - 1; i >= 0 && !second; i--) {
    second = await menuDelete(page, i);
    if (!second) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
  }
  expect(second, "no second correctable entry — the check cannot run, re-seed").toBe(true);
  await page.locator(".cor-act").first().click();
  await page.waitForTimeout(3500);

  /**
   * ⚠️ THE CLAIM IS "GONE OR INERT AND SAYS SO", so absence is not what is measured — behaviour is.
   * The first reading of this check asserted that at most one undo remained on screen, found two,
   * and called it a fault. Two toasts is not the fault: a STALE ONE THAT STILL ACTS is. So the
   * older undo is pressed on purpose, and what must be true is that the documents do not move and
   * the writer is told why.
   */
  const toastCount = await page.locator(".sa-toast-undo").count();
  console.log(`  after the second write — undos on screen: ${toastCount}`);

  const stale = page.locator(".sa-toast", { hasText: firstMessage }).locator(".sa-toast-undo");
  if (!(await stale.count())) {
    console.log("  the older undo was withdrawn from the screen — gone rather than inert");
  } else {
    const beforePress = await snapshotQuery("cor-undo");
    await stale.first().click();
    await page.waitForTimeout(3500);
    const afterPress = await snapshotQuery("cor-undo");
    const moved = diffReport(beforePress, afterPress);
    console.log(`  pressed the stale undo · documents changed: ${moved.length}`);
    expect(moved, "A STALE UNDO ACTED — it restored a record the newer write had moved past").toEqual([]);

    const said = await page.locator(".sa-toast").allTextContents();
    console.log(`  it said: ${said.map((t) => t.replace(/\s+/g, " ").trim()).join(" | ")}`);
    expect(said.some((t) => /can.?t be undone|has changed since/i.test(t)),
      "the stale undo did nothing and said nothing — silence is the empty-closure fault again").toBe(true);
  }
});

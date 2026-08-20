/**
 * Phase 5 — the correction UI on the deployed page.
 *
 * ⚠️ CHECK 1 IS THE ONE THAT MATTERS: the sheet's preview must match the outcome exactly, because
 * that is what proves ONE engine ran both sides. A divergence means two derivations exist, which is
 * the single thing this pack must not produce — so it is reported, never patched.
 *
 *   npx playwright test --project=measure qcCorrection
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE PROJECTIONS ARE NOT PART OF THE COMPARISON, AND THIS IS THE PROBE'S OWN CORRECTION.
 *
 * The first run of this file reported a divergence, and the divergence was mine. "Waiting to hear
 * back" is a `TlProjection` — derived from `query.status` and the CTA engine, NOT from the activity
 * log — so `buildTimelineRows` never emits it and the preview could not contain it however correct
 * it was. Scraping every `.tl-ttl` put it on the outcome side of an equality with the preview, and
 * the probe failed a comparison it had constructed wrongly. THE ENGINE WAS RIGHT: the reorder it
 * predicted is exactly the reorder that landed.
 *
 * ⚠️ AND THE EXCLUSION STATES ITS OWN PRECONDITION rather than trusting itself. Dropping rows from
 * one side of an equality is precisely how a check goes green having measured nothing, so the
 * projections are captured too and asserted UNCHANGED across the write — if a correction ever moves
 * one, this fails instead of quietly ignoring it.
 */
const readTimeline = (page: any) => page.evaluate(() => {
  const evs = Array.from(document.querySelectorAll(".tl-ev"));
  const isProjection = (e: Element) => !!e.querySelector(".tl-waitmark, .tl-ghostmark");
  const title = (e: Element) => (e.querySelector(".tl-r1 .tl-ttl")?.textContent || "").trim();
  return {
    events: evs.filter((e) => !isProjection(e)).map(title),
    projections: evs.filter(isProjection).map(title),
  };
});

test("5 · the ⋯ is absent from the To-do focus sheet", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  const dots = await page.evaluate(() => document.querySelectorAll(".tdb-ffhubtl .tl-more").length);
  console.log(`  ⋯ controls inside the focus sheet's timeline: ${dots}`);
  expect(dots, "the correction menu leaked into the focus sheet").toBe(0);
});

test("1+4 · the preview matches the outcome, and a note-only edit raises no sheet", async ({ page }) => {
  test.setTimeout(180000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  /* pick a query with at least three rungs, so a date edit has something to cross */
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 20);
  let chosen = -1;
  for (let i = 0; i < n; i++) {
    try { await rows.nth(i).click({ timeout: 2500 }); } catch { continue; }
    await page.waitForTimeout(320);
    if ((await page.locator(".tl-more").count()) >= 3) { chosen = i; break; }
  }
  expect(chosen, "no query with three correctable entries — nothing to cross").toBeGreaterThanOrEqual(0);

  const before = await readTimeline(page);
  console.log(`  events before:      ${before.events.join(" | ")}`);
  console.log(`  projections before: ${before.projections.join(" | ")}`);

  /* open ⋯ on the LAST correctable entry and take the correction branch */
  const dots = page.locator(".tl-more");
  await dots.nth((await dots.count()) - 1).click();
  await page.waitForTimeout(400);
  const editItem = page.locator(".f12-menuitem, [role=menuitem], button", { hasText: /^Edit$/ }).first();
  if (!(await editItem.count())) { console.log("  ⚠️ no Edit item in the ⋯ menu — unexercised"); return; }
  await editItem.click();
  await page.waitForTimeout(500);

  /* the fork, then branch one */
  const fork = page.locator(".cor-branch", { hasText: "correcting a mistake" });
  expect(await fork.count(), "the fork did not appear").toBeGreaterThan(0);
  await fork.first().click();
  await page.waitForTimeout(400);

  /* 4 · a note-only edit must raise NO sheet */
  await page.locator("#cor-note").fill("note only, no consequences");
  await page.locator(".cor-save").click();
  await page.waitForTimeout(2500);
  const sheetAfterNote = await page.locator(".cor-tl, .cor-ledger").count();
  console.log(`  4 · sheet after a note-only edit: ${sheetAfterNote} (expect 0)`);
  expect(sheetAfterNote, "a note-only edit raised a consequence sheet").toBe(0);

  /* 1 · a date edit that crosses another event — capture the PREVIEW, then the OUTCOME */
  await page.waitForTimeout(800);
  const dots2 = page.locator(".tl-more");
  await dots2.nth((await dots2.count()) - 1).click();
  await page.waitForTimeout(400);
  await page.locator(".f12-menuitem, [role=menuitem], button", { hasText: /^Edit$/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator(".cor-branch", { hasText: "correcting a mistake" }).first().click();
  await page.waitForTimeout(400);

  /* drag the last entry back before the one above it */
  const firstDate = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".tl-r1"));
    return rows.length ? (rows[0].textContent || "") : "";
  });
  console.log(`  earliest row reads: ${firstDate.replace(/\s+/g, " ").trim()}`);
  await page.locator("#cor-date").fill("2024-01-02");
  await page.locator(".cor-save").click();
  await page.waitForTimeout(900);

  const preview = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".cor-tlrow")).map((e) => ({
      title: (e.querySelector(".cor-tlttl")?.textContent || "").trim(),
      gone: e.className.includes("cor-tlrow--gone"),
    })));
  expect(preview.length, "no timeline preview rendered — the sheet did not appear").toBeGreaterThan(0);
  console.log(`  1 · PREVIEW: ${preview.map((p) => (p.gone ? `[${p.title}]` : p.title)).join(" | ")}`);

  /* commit, then read the real timeline */
  await page.locator(".cor-act").first().click();
  await page.waitForTimeout(3500);
  const after = await readTimeline(page);
  const outcome = after.events;
  console.log(`  1 · OUTCOME: ${outcome.join(" | ")}`);
  console.log(`  projections after:  ${after.projections.join(" | ")}`);

  /**
   * ⚠️ THE COMPARISON IS THE SURVIVING ROWS IN ORDER. The preview draws removed rungs too (struck),
   * so they are filtered out before comparing — what must match is the record as it will be.
   */
  const predicted = preview.filter((p) => !p.gone).map((p) => p.title);
  console.log(`  1 · predicted survivors: ${predicted.join(" | ")}`);
  /* the precondition: the excluded rows are the SAME rows, or the exclusion is hiding something */
  expect(after.projections.join("|"), "a projection moved — it is no longer safe to exclude them")
    .toBe(before.projections.join("|"));
  expect(outcome.join("|"), "PREVIEW DIVERGED FROM OUTCOME — two derivations exist").toBe(predicted.join("|"));
});

/**
 * ⚠️ THESE TWO NEED A SHAPE THE ACCOUNT MAY NOT HOLD, so they SCAN and say so when it is absent.
 * A check that quietly passes because it found nothing to test is the precondition gap in its
 * cheapest form — the console line is the difference between "verified" and "unexercised".
 */
const selectWith = async (page: any, want: RegExp): Promise<boolean> => {
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 25);
  for (let i = 0; i < n; i++) {
    try { await rows.nth(i).click({ timeout: 2500 }); } catch { continue; }
    await page.waitForTimeout(320);
    const titles = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".tl-ev")).map((e) => (e.querySelector(".tl-r1 .tl-ttl")?.textContent || "").trim()));
    if (titles.some((t: string) => want.test(t))) return true;
  }
  return false;
};

test("2 · remove both, then undo puts both back", async ({ page }) => {
  test.setTimeout(180000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  /* a request with the send that answers it — the dependency guard's whole subject */
  const found = await selectWith(page, /asked for|requested/i);
  if (!found) { console.log("  2 · ⚠️ UNEXERCISED — no query holds a request with a dependent send"); return; }

  const before = await readTimeline(page);
  console.log(`  2 · before: ${before.events.join(" | ")}`);

  const dots = page.locator(".tl-more");
  let opened = false;
  for (let i = 0; i < (await dots.count()); i++) {
    await dots.nth(i).click(); await page.waitForTimeout(350);
    const del = page.locator(".f12-menuitem, [role=menuitem], button", { hasText: /Delete|Remove/i }).first();
    if (await del.count()) { await del.click(); opened = true; break; }
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  }
  if (!opened) { console.log("  2 · ⚠️ UNEXERCISED — no Delete item found"); return; }
  await page.waitForTimeout(600);

  const both = page.locator(".cor-act", { hasText: /Remove both/i });
  if (!(await both.count())) { console.log("  2 · ⚠️ UNEXERCISED — no cascade offered on this entry"); return; }
  console.log(`  2 · the sheet offered: ${(await page.locator(".cor-act b").allTextContents()).join(" / ")}`);
  await both.first().click();
  await page.waitForTimeout(3000);

  const after = await readTimeline(page);
  console.log(`  2 · after remove: ${after.events.join(" | ")}`);
  expect(after.events.length, "remove-both removed nothing").toBeLessThan(before.events.length);
  expect(before.events.length - after.events.length, "remove-both removed only one entry").toBe(2);

  /* the undo the toast promises must actually restore — both entries, one press */
  const undo = page.locator("button", { hasText: /^Undo$/ }).first();
  expect(await undo.count(), "no undo was offered for a removal").toBeGreaterThan(0);
  await undo.click();
  await page.waitForTimeout(4000);
  const back = await readTimeline(page);
  console.log(`  2 · after undo:  ${back.events.join(" | ")}`);
  expect(back.events.join("|"), "UNDO DID NOT RESTORE THE RECORD").toBe(before.events.join("|"));
});

test("6 · removing a closure reopens the query", async ({ page }) => {
  test.setTimeout(180000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  const found = await selectWith(page, /rejected|passed|withdrew|no reply|declined/i);
  if (!found) { console.log("  6 · ⚠️ UNEXERCISED — no closed query in the account"); return; }

  const statusOf = () => page.evaluate(() => {
    const el = document.querySelector(".f12-hstatus, .f12-status, .qp-status");
    return (el?.textContent || "").trim();
  });
  const before = await statusOf();
  console.log(`  6 · status before: ${before}`);

  const dots = page.locator(".tl-more");
  const n = await dots.count();
  let sheet = false;
  for (let i = n - 1; i >= 0; i--) {
    await dots.nth(i).click(); await page.waitForTimeout(350);
    const del = page.locator(".f12-menuitem, [role=menuitem], button", { hasText: /Delete|Remove/i }).first();
    if (!(await del.count())) { await page.keyboard.press("Escape"); continue; }
    await del.click(); await page.waitForTimeout(700);
    if (await page.locator(".cor-tl, .cor-ledger").count()) { sheet = true; break; }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  if (!sheet) { console.log("  6 · ⚠️ UNEXERCISED — no removable closure entry"); return; }

  /**
   * ⚠️ THE SHEET IS READ BEFORE THE COMMIT, because the reopening is exactly the consequence it is
   * there to state. A query that silently came back to life would be the sheet failing at its job
   * even if the derivation were right.
   */
  const shown = await page.locator(".cor-tlsum, .cor-ledrow").allTextContents();
  console.log(`  6 · the sheet stated: ${shown.join(" | ")}`);
  await page.locator(".cor-act").first().click();
  await page.waitForTimeout(3500);

  const after = await statusOf();
  console.log(`  6 · status after:  ${after}`);
  expect(after, "removing the closure left the query closed").not.toBe(before);
});

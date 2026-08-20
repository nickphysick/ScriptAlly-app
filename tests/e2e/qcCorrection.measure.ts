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
  const n = await rows.count();
  let chosen = -1;
  for (let i = 0; i < n; i++) {
    try { await rows.nth(i).click({ timeout: 2500 }); } catch { continue; }
    await page.waitForTimeout(320);
    if ((await page.locator(".tl-more").count()) >= 2) { chosen = i; break; }
  }
  expect(chosen, "no query with two correctable entries — nothing to cross").toBeGreaterThanOrEqual(0);

  const before = await readTimeline(page);
  console.log(`  events before:      ${before.events.join(" | ")}`);
  console.log(`  projections before: ${before.projections.join(" | ")}`);

  /* open ⋯ on the LAST correctable entry and take the correction branch */
  const dots = page.locator(".tl-more");
  await dots.nth((await dots.count()) - 1).click();
  await page.waitForTimeout(400);
  const editItem = page.locator("[role=menuitem], .f12-menuitem", { hasText: /^Edit$/ }).first();
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
  await page.locator("[role=menuitem], .f12-menuitem", { hasText: /^Edit$/ }).first().click();
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
/**
 * ⚠️ MENU LOCATORS ARE SCOPED TO THE MENU. Including a bare `button` in the union matched the
 * PAGE-LEVEL "Delete" in the control row instead of the entry menu's "Delete…", so the probe opened
 * "Delete this query?" and then reported the root guard three times over. Nothing about the failure
 * pointed at the selector — it looked exactly like a guard misfiring.
 */
const selectWith = async (page: any, want: RegExp): Promise<boolean> => {
  const rows = page.locator(".f12-row");
  const n = await rows.count();
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

  /**
   * ⚠️ THE SHAPE THIS NEEDS IS "MORE THAN ONE CORRECTABLE ENTRY", not "mentions a request". The
   * first scan asked for the wording and landed on a query holding a single real document that was
   * also its earliest — so every path led to the root guard and nothing could be removed at all.
   * A synthesised root carries no ⋯, so counting the ⋯ controls counts what is actually correctable.
   */
  const rows = page.locator(".f12-row");
  const total = await rows.count();
  let found = false;
  for (let i = 0; i < total; i++) {
    try { await rows.nth(i).click({ timeout: 2500 }); } catch { continue; }
    await page.waitForTimeout(340);
    /**
     * ⚠️ THE CONDITION IS "A REMOVAL IS ALLOWED HERE", not "there are two entries". A synthesised
     * root carries no `activityId`, so the root guard compares against it and ALLOWS the single real
     * entry to go — a shape a two-entry requirement skips over. The loop below is what actually
     * decides; this only has to find a query worth trying.
     */
    if ((await page.locator(".tl-more").count()) >= 1) { found = true; break; }
  }
  if (!found) { console.log("  2 · ⚠️ UNEXERCISED — no correctable entry anywhere in the account"); return; }

  const before = await readTimeline(page);
  console.log(`  2 · before: ${before.events.join(" | ")}`);

  /**
   * ⚠️ AN ENTRY WHOSE DELETE RAISES NO SHEET IS THE ROOT GUARD DOING ITS JOB, not a missing sheet —
   * the earliest event routes to "delete the query" instead, so the probe steps past it and tries
   * the next. The first version of this loop took whichever ⋯ came first, met the root confirm, and
   * then waited three minutes for a `.cor-act` that was never coming.
   */
  const dots = page.locator(".tl-more");
  let opened = false;
  for (let i = (await dots.count()) - 1; i >= 0; i--) {
    await dots.nth(i).click(); await page.waitForTimeout(350);
    const del = page.locator("[role=menuitem], .f12-menuitem", { hasText: /Delete/i }).first();
    if (!(await del.count())) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); continue; }
    await del.click(); await page.waitForTimeout(900);
    if (await page.locator(".cor-act").count()) { opened = true; break; }
    console.log(`  2 · entry ${i} raised no sheet (root guard) — trying the next`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    const close = page.locator("button", { hasText: /^Close$/ }).first();
    if (await close.count()) { await close.click(); await page.waitForTimeout(300); }
  }
  if (!opened) {
    /* every entry here is guarded — try the rest of the list rather than reporting the account bare */
    for (let r = 0; r < (await rows.count()) && !opened; r++) {
      try { await rows.nth(r).click({ timeout: 2000 }); } catch { continue; }
      await page.waitForTimeout(320);
      const d = page.locator(".tl-more");
      for (let i = (await d.count()) - 1; i >= 0 && !opened; i--) {
        await d.nth(i).click(); await page.waitForTimeout(320);
        const del = page.locator("[role=menuitem], .f12-menuitem", { hasText: /Delete/i }).first();
        if (!(await del.count())) { await page.keyboard.press("Escape"); continue; }
        await del.click(); await page.waitForTimeout(800);
        if (await page.locator(".cor-act").count()) { opened = true; break; }
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
        const c = page.locator("button", { hasText: /^Close$/ }).first();
        if (await c.count()) { await c.click(); await page.waitForTimeout(250); }
      }
    }
  }
  if (!opened) { console.log("  2 · ⚠️ UNEXERCISED — every correctable entry in the account is guarded"); return; }
  const before2 = await readTimeline(page);
  console.log(`  2 · on the query that allows it: ${before2.events.join(" | ")}`);

  /**
   * ⚠️ THE CASCADE AND THE INVERSE ARE TWO CLAIMS, and only one of them needs a request-with-send to
   * test. If this account holds no such pair the cascade half cannot run — but the RESTORE is the
   * new code and is exercised either way, because one removal and two travel through exactly the
   * same primitive. Reporting "unexercised" for the whole check would have left the thing this
   * commit exists to fix unverified for want of a fixture.
   */
  const both = page.locator(".cor-act", { hasText: /Remove both/i });
  const cascade = (await both.count()) > 0;
  console.log(`  2 · the sheet offered: ${(await page.locator(".cor-act b").allTextContents()).join(" / ")}`);
  if (!cascade) console.log("  2 · ⚠️ CASCADE UNEXERCISED — no request-with-send pair in this account; testing the inverse on a single removal");
  await (cascade ? both.first() : page.locator(".cor-act").first()).click();
  await page.locator(".sa-toast-undo").first().waitFor({ timeout: 15000 }).catch(() => {});

  const after = await readTimeline(page);
  console.log(`  2 · after remove: ${after.events.join(" | ")}`);
  const gone = before2.events.length - after.events.length;
  console.log(`  2 · entries removed: ${gone}`);
  expect(gone, "the removal removed nothing").toBeGreaterThan(0);
  if (cascade) expect(gone, "remove-both removed only one entry").toBe(2);

  /**
   * ⚠️ THE TOAST'S OWN CLASS, NOT ITS WORDS. The label is rendered `.toUpperCase()`, so a
   * case-sensitive `/^Undo$/` matched nothing and the probe reported "no undo was offered" about a
   * button that was on screen — the wiring fault it was written to catch, wearing the same face.
   * The toast also expires in about six seconds, so this waits for it rather than sleeping past it.
   */
  const undo = page.locator(".sa-toast-undo").first();
  await undo.waitFor({ timeout: 12000 }).catch(() => {});
  expect(await undo.count(), "no undo was offered for a removal").toBeGreaterThan(0);
  await undo.click();
  await page.waitForTimeout(4000);
  const back = await readTimeline(page);
  console.log(`  2 · after undo:  ${back.events.join(" | ")}`);
  expect(back.events.join("|"), "UNDO DID NOT RESTORE THE RECORD").toBe(before2.events.join("|"));
});

test("6 · removing a closure reopens the query", async ({ page }) => {
  test.setTimeout(180000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  const found = await selectWith(page, /rejected|passed|withdrew|no reply|declined/i);
  if (!found) { console.log("  6 · ⚠️ UNEXERCISED — no closed query in the account"); return; }

  const statusOf = () => page.evaluate(() => {
    const el = document.querySelector(".qc-mstatus");
    return (el?.textContent || "").trim();
  });
  const before = await statusOf();
  console.log(`  6 · status before: ${before}`);

  const dots = page.locator(".tl-more");
  const n = await dots.count();
  let sheet = false;
  for (let i = n - 1; i >= 0; i--) {
    await dots.nth(i).click(); await page.waitForTimeout(350);
    const del = page.locator("[role=menuitem], .f12-menuitem", { hasText: /Delete/i }).first();
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

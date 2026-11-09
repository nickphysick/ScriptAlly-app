/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 — the report's screenshots, one per reference screen (design-refs/query-centre-v149/screens/01–15),
 * at 1280×800 and 1512×900, into reports/qc-v149/screens/. Not a lock.
 * ⚠️ 09 and 13 WRITE (a response saved, a query logged): each is undone in the same run through the undo bar, and the run
 *    fails loudly if the undo is not there — a screenshot is never worth a changed account.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { CARD, SIZES, closePanel, openPanel, rows, tap, undo } from "./qc149Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);
const DIR = "reports/qc-v149/screens";
mkdirSync(DIR, { recursive: true });

const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });
const scrollList = (page: Page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  const tb = [...document.querySelectorAll<HTMLElement>("[data-qc140='toolbar']")].find((e) => e.getBoundingClientRect().height > 0);
  if (sc && tb) sc.scrollTop += tb.getBoundingClientRect().top - sc.getBoundingClientRect().top - 24;
});

for (const vp of SIZES) {
  const w = vp.width;
  test(`screens @ ${w}`, async ({ page }) => {
    await openQc(page, vp);
    await shot(page, "01-page", w);
    await scrollList(page); await page.waitForTimeout(500);
    await shot(page, "02-list", w);
    await tap(page, "[data-qc149='view'][data-k='you']"); await page.waitForTimeout(900);
    await shot(page, "03-with-you", w);
    await tap(page, "[data-qc149='view'][data-k='you']"); await page.waitForTimeout(900);

    const all = await rows(page);
    const over = all.find((r) => r.due != null && r.due < Date.now() && r.where !== "closed") ?? all[0];
    const sel = `.qc138-sheet [data-qcv='row'][data-id="${over.id}"]`;
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(`${sel} [data-qcv='row-first']`).first().hover();
    await page.waitForTimeout(1400);
    await shot(page, "04-hover-timeline", w);
    await page.mouse.move(5, 5);

    const q = all.find((r) => r.status === "Queried" && r.where === "agent") ?? all.find((r) => r.status === "Queried")!;
    await openPanel(page, q.id);
    await shot(page, "05-panel-tracking", w);
    await tap(page, `${CARD} [data-qc149c='tab'][data-tab='agent']`); await page.waitForTimeout(400);
    await shot(page, "06-panel-agent", w);
    await tap(page, `${CARD} [data-qc149c='tab'][data-tab='materials']`); await page.waitForTimeout(400);
    await shot(page, "07-panel-materials", w);
    await tap(page, `${CARD} [data-qc149c='tab'][data-tab='tracking']`); await page.waitForTimeout(300);

    await tap(page, `${CARD} [data-qc149c='record']`); await page.waitForTimeout(500);
    await tap(page, `${CARD} [data-qc149c='resp-opt'][data-k='full']`); await page.waitForTimeout(300);
    await shot(page, "08-respond", w);
    await tap(page, `${CARD} [data-qc149c='save-response']`); await page.waitForTimeout(3500);
    await shot(page, "09-respond-saved", w);
    expect(await undo(page), "09: no undo bar — the account has been changed").toBe(true);
    await page.waitForTimeout(1200);
    const back = await page.evaluate((id) => document.querySelector<HTMLElement>(`.qc138-sheet [data-qcv='row'][data-id="${id}"]`)?.dataset.status ?? null, q.id);
    expect(back, "09: the response was not undone").toBe("Queried");

    await tap(page, `${CARD} [data-qc149c='edit']`); await page.waitForTimeout(500);
    await shot(page, "10-edit", w);
    await tap(page, `${CARD} [data-qc149c='cancel']`); await page.waitForTimeout(300);
    await closePanel(page);

    const before = (await rows(page)).length;
    await tap(page, "[data-qc149='log']"); await page.waitForTimeout(1000);
    await shot(page, "11-log-pick-agent", w);
    /* Log a query v1 — the staged journey: Agent, Sent, Materials, How, the check, the celebration; Undo is the celebration's */
    await tap(page, "[data-qls='agent'][data-group='ready']"); await page.waitForTimeout(500);
    await tap(page, "[data-qls='when-opt'][data-k='today']"); await page.waitForTimeout(400);
    if (await page.locator("[data-qls='package']").count()) await tap(page, "[data-qls='package']"); else await tap(page, "[data-qls='pieces-continue']");
    await page.waitForTimeout(400);
    if (await page.locator("[data-qls='root'][data-step='how']").count()) await tap(page, "[data-qls='how-opt']");
    await page.waitForTimeout(400);
    await shot(page, "12-log-fill", w);
    await tap(page, "[data-qls='log']"); await page.waitForTimeout(3500);
    await shot(page, "13-log-saved", w);
    await tap(page, "[data-qls='undo']"); await page.waitForTimeout(2500);
    expect(await page.locator("[data-qls='root'][data-step='check']").count(), "13: Undo did not return to the check — the account may have been changed").toBe(1);
    await page.waitForTimeout(1500);
    expect((await rows(page)).length, "13: the logged query was not undone").toBe(before);
    await closePanel(page);

    await tap(page, "[data-qc149='record']"); await page.waitForTimeout(1000);
    await shot(page, "14-record-who-replied", w);
    await closePanel(page);

    await tap(page, "[data-qc149='full']"); await page.waitForTimeout(1500);
    await shot(page, "15-full-screen", w);
    await tap(page, "[data-qc142='full-tb']");
  });
}

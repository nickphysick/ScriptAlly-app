/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26.1 — the before/after screenshots for the report, at 1512 × 982 and 1280 × 832: the sidebar,
 * the builder with and without a note, Your materials, Results on the test account, and the stuck tab bar. Not a lock:
 * it asserts nothing. `PK261_SHOTS=before|after` names the folder; run "before" against the deployed v26 build
 * (`SA_E2E_BASE_URL=dev`) and "after" against this branch's. Writes nothing without the variable.
 *
 * FIXTURE: seedPk26.mjs (pk26-ms — the note, the long letter name) and the harness account's "The Smoke Test"
 * (seed-ms-1) for Results and the stuck bar.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const WHICH = process.env.PK261_SHOTS ?? "";
const OUT = `reports/submission-packages-v26/v26-1/${WHICH}`;
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-pk26="page"]'))`;

async function open(page: Page, size: { width: number; height: number }, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk26="page"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const vis = (page: Page, sel: string) => page.locator(`${sel}:visible`).first();

for (const size of [{ width: 1512, height: 982 }, { width: 1280, height: 832 }]) {
  const w = size.width;
  test(`v26.1 shots ${w}`, async ({ page }) => {
    test.skip(!WHICH, "PK261_SHOTS=before|after");
    test.setTimeout(300_000);
    mkdirSync(OUT, { recursive: true });
    const el = (sel: string, name: string) => vis(page, sel).screenshot({ path: `${OUT}/${name}-${w}.png` });

    /* the fixture: the note, the long letter name */
    await open(page, size, "pk26-ms");
    const side = await page.evaluate(() => {
      const a = [...document.querySelectorAll('button.ws-ni[aria-label="Query Centre"]')].find((e) => (e as HTMLElement).offsetParent)!.getBoundingClientRect();
      const b = [...document.querySelectorAll('button.ws-ni[aria-label="Comparable titles"]')].find((e) => (e as HTMLElement).offsetParent)!.getBoundingClientRect();
      return { x: 0, y: Math.max(0, a.top - 40), width: Math.ceil(b.right + 12), height: Math.ceil(b.bottom - a.top + 56) };
    });
    await page.screenshot({ path: `${OUT}/sidebar-${w}.png`, clip: side });
    await vis(page, '.p6-pkb[title="Sent one"]').click(); await page.waitForTimeout(400);
    await el('[data-pk26="open"] .p6-po-h', "builder-note");
    await vis(page, '.p6-pkb[title="Drag target"]').click(); await page.waitForTimeout(400);
    await el('[data-pk26="open"] .p6-po-h', "builder-no-note");
    await el('[data-pk26="lib"]', "your-materials");

    /* the test account */
    await open(page, size, "seed-ms-1");
    await page.evaluate(`(() => { const s = ${SCROLLER}; const e = s && s.querySelector('[data-pk26="results"]'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - 24; })()`);
    await page.waitForTimeout(400);
    await el('[data-pk26="results"]', "results");
    await page.evaluate(`(() => { const s = ${SCROLLER}; const e = s && s.querySelector('[data-pk26="lib"]'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top + 60; })()`);
    await page.waitForTimeout(400);
    const bar = await page.evaluate(() => {
      const t = [...document.querySelectorAll('[data-pk26="tabs"]')].find((e) => (e as HTMLElement).offsetParent)!.getBoundingClientRect();
      return { x: 0, y: Math.max(0, t.top - 30), width: window.innerWidth, height: Math.ceil(t.height + 110) };
    });
    await page.screenshot({ path: `${OUT}/stuck-tab-bar-${w}.png`, clip: bar });
  });
}

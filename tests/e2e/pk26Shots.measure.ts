/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the report's screenshots, one per ref screen (design-refs/submission-packages-v26/screens),
 * at 1512 × 982 and 1280 × 832. Not a lock: it asserts nothing. Run with `PK26_SHOTS=1` (and `PK26_ONLY=<name>` to take
 * one); it writes nothing otherwise.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const ON = process.env.PK26_SHOTS === "1";
const ONLY = process.env.PK26_ONLY ?? "";
const OUT = "reports/submission-packages-v26/shots";
const MS = process.env.PK26_MS ?? "seed-ms-1";
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-pk26="page"]'))`;

export async function openPk26(page: Page, size: { width: number; height: number }, ms = MS) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk26="page"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
export const scrollToPart = (page: Page, part: string, offset = 24) =>
  page.evaluate(`(() => { const s = ${SCROLLER}; const e = s && s.querySelector('[data-pk26="${part}"]'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - ${offset}; })()`);

const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }];
for (const size of SIZES) {
  const w = size.width;
  test(`v26 views ${w}`, async ({ page }) => {
    test.skip(!ON, "PK26_SHOTS=1");
    test.setTimeout(300_000);
    mkdirSync(OUT, { recursive: true });
    const shot = async (n: string) => { if (!ONLY || ONLY === n) await page.screenshot({ path: `${OUT}/${n}-${w}.png` }); };
    await openPk26(page, size);
    await shot("01-in-use-top");
    await scrollToPart(page, "tabs", 0); await page.waitForTimeout(300); await shot("02-package-builder");
    await page.locator('[data-pk26="open"] .p6-exa-b').first().click().catch(() => {}); await page.waitForTimeout(300); await shot("03-also-sends-add");
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await scrollToPart(page, "results", 24); await page.waitForTimeout(300); await shot("05-results");
    await page.locator('[data-pk26="tabs"] .p6-t-let').click(); await page.waitForTimeout(400);
    await scrollToPart(page, "page", 0); await page.waitForTimeout(300); await shot("06-query-letters-tab");
    await page.locator('[data-pk26="materials"] .p6-xtb-r[data-mat]').first().click().catch(() => {}); await page.waitForTimeout(700); await shot("07-letter-drawer");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.locator('[data-pk26="tabs"] .p6-t-syn').click(); await page.waitForTimeout(400); await shot("08-synopses-tab");
    await page.locator('[data-pk26="tabs"] .p6-lead').click(); await page.waitForTimeout(300);
    await scrollToPart(page, "page", 0);
    await page.locator('[data-pk26="header"] .p6-hd-p').click(); await page.waitForTimeout(500); await shot("04-new-package-dialog");
  });
}

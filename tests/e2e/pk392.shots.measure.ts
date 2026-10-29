/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.2 — the screenshots beside the pack's 01–06 (design-refs/submission-packages-v39-2/screens/),
 * at 1512 × 982 and 1280 × 832, into reports/submission-packages-v39-2/app/. Not a lock: it runs only with
 * PK392_SHOTS=1, so a routine run writes nothing. FIXTURE: seedPk40.mjs (pk40-ms), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-2/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK392_SHOTS, "screenshots only with PK392_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { seed(); mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  await openRoute(page, "/queries/packages", size);
  await page.evaluate(() => { try { localStorage.removeItem("sa.guide.packages-explainer"); } catch { /* */ } });
  await page.reload();
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
async function to(page: Page, sel: string | null, gap = 24) {
  await page.evaluate(({ s, gap }) => {
    const sc = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement;
    if (!s) { sc.scrollTop = 0; return; }
    const e = sc.querySelector(s) as HTMLElement | null;
    if (e) sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - gap;
  }, { s: sel, gap });
  await page.waitForTimeout(400);
}
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });

for (const size of SIZES) {
  test(`screens at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    const W = size.width;
    await open(page, size);
    await to(page, null); await shot(page, "01-header-pattern", W);
    await to(page, ".p9-tip", 60); await page.mouse.move(2, 2); await shot(page, "02-packages-panel", W);
    await to(page, ".p9-bk-k", 32); await shot(page, "03-builder-version-first", W);
    /* a sent package is locked and offers no Add (v38); "Ready one" shows the hover the ref draws */
    await page.locator(`${pg} [data-pk39="labels"] [data-pkid="pk40-ready"]`).first().click(); await page.waitForTimeout(600);
    await to(page, ".p9-bk-k", 32);
    await page.locator(`${pg} [data-pk26="lib-list"] .p9-lr:not(.p9-inpk)`).first().hover(); await page.waitForTimeout(400);
    await shot(page, "04-materials-row-hover", W);
    await page.locator(`${pg} .p9-lib-tabs .p9-t-let`).first().click(); await page.mouse.move(2, 2); await page.waitForTimeout(500);
    await shot(page, "05-materials-letters", W);
    await to(page, '[data-pk38="row-pieces"]', 0); await shot(page, "06-pieces-version-first", W);
  });
}

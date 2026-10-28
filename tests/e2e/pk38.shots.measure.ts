/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — the screenshots beside the pack's 01–09 (design-refs/submission-packages-v38/screens/),
 * at 1512 × 982 and 1280 × 832, into reports/submission-packages-v38/app/. Not a lock: it runs only with PK38_SHOTS=1,
 * so a routine run writes nothing. FIXTURE: seedPk40.mjs (pk40-ms in use, pk40-new with nothing logged), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v38/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK38_SHOTS, "screenshots only with PK38_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { seed(); mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk38="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
/** scroll the page's own scroller so `sel` sits `gap` below its top, as the refs frame it */
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
const esc = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(400); };

for (const size of SIZES) {
  test(`in use at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    const W = size.width;
    await open(page, size, "pk40-ms");
    await to(page, null); await shot(page, "01-top", W);
    await to(page, '[data-pk38="labels"]'); await shot(page, "02-labels-and-builder", W);
    await page.locator(`${pg} [data-pk38="figures"]`).first().click(); await page.waitForTimeout(800);
    await shot(page, "03-package-drawer", W); await esc(page);
    await page.locator(`${pg} [data-pk38="labels"] .p8-pkl-f`).first().click(); await page.waitForTimeout(400);
    await page.locator(`${pg} [data-pk38="labels"] [data-pkid="pk40-old"]`).first().click(); await page.waitForTimeout(800);
    await shot(page, "04-retired-drawer", W); await esc(page);
    await page.locator(`${pg} [data-pk38="labels"] .p8-pkl-f`).first().click(); await page.waitForTimeout(300);
    await page.locator(`${pg} [data-pk38="labels"] [data-pkid="pk40-ready"]`).first().click(); await page.waitForTimeout(500);
    await to(page, '[data-pk38="labels"]'); await shot(page, "05-other-package-selected", W);
    await page.locator(`${pg} [data-pk38="labels"] [data-pkid="pk40-std"]`).first().click(); await page.waitForTimeout(400);
    await to(page, '[data-pk38="band"]', 0); await shot(page, "06-results-banner-packages", W);
    await to(page, '[data-pk38="row-pieces"]'); await shot(page, "07-results-pieces-footer", W);
  });
  test(`nothing logged at ${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    const W = size.width;
    await open(page, size, "pk40-new");
    await to(page, null); await shot(page, "08-empty", W);
    await to(page, '[data-pk38="band"]', 120); await shot(page, "09-empty-results", W);
  });
}

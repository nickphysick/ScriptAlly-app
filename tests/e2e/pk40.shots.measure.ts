/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the screenshots beside the pack's 01–17 (design-refs/submission-packages-v40/screens/),
 * at 1512 × 982 and 1280 × 832, into reports/submission-packages-v40/. Not a lock: it runs only with PK40_SHOTS=1, so a
 * routine run writes nothing. FIXTURE: seedPk40.mjs (pk40-ms in use, pk40-new brand new), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v40/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK40_SHOTS, "screenshots only with PK40_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { seed(); mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openRoute(page, "/queries/packages", size);
  await page.locator(pg).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
/** scroll the page's own scroller so `sel` sits just under the pinned tab bar (as the refs show it) */
async function to(page: Page, sel: string | null) {
  await page.evaluate((s) => {
    const sc = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement;
    if (!s) { sc.scrollTop = 0; return; }
    const e = sc.querySelector(s) as HTMLElement | null;
    if (!e) return;
    const tabs = sc.querySelector('[data-pk26="tabs"]') as HTMLElement | null;
    sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - (tabs ? tabs.offsetHeight + 16 : 0);
  }, sel);
  await page.waitForTimeout(400);
}
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });
const esc = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(350); };

for (const size of SIZES) {
  test(`in use at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    const W = size.width;
    await open(page, size, "pk40-ms");
    await to(page, null); await shot(page, "01-in-use-top", W);
    await to(page, '[data-pk40="shelf"]'); await shot(page, "02-shelf", W);
    await page.locator(`${pg} [data-pk40="wb-sel"] [data-pkid="pk40-ready"]`).first().click();
    await page.waitForTimeout(400);
    await to(page, '[data-pk40="wbf"]'); await shot(page, "03-workbench", W);
    await page.evaluate(() => { const d = document.querySelector('[data-pk40="guidelines"]') as HTMLDetailsElement | null; if (d) d.open = true; });
    await to(page, '[data-pk40="guidelines"]'); await shot(page, "04-guidelines-open", W);
    await page.evaluate(() => { const d = document.querySelector('[data-pk40="guidelines"]') as HTMLDetailsElement | null; if (d) d.open = false; });
    await to(page, '[data-pk40="shelf"]');
    await page.locator(`${pg} [data-pk40="tile"][data-pkid="pk40-std"]`).first().click(); await page.waitForTimeout(700);
    await shot(page, "05-shelf-drawer", W); await esc(page);
    await page.locator(`${pg} [data-pk40="wbh"] button`).first().click(); await page.waitForTimeout(700);
    await shot(page, "06-new-package-dialog", W); await esc(page);
    for (const [v, n] of [["a", "07-tracking-head-to-head"], ["b", "08-tracking-scoreboard"], ["c", "09-tracking-tests"]] as const) {
      await page.locator(`${pg} [data-pk40="tp"] [data-tpv="${v}"]`).first().click(); await page.waitForTimeout(400);
      await to(page, '[data-pk40="tp"]'); await shot(page, n, W);
    }
    await page.locator(`${pg} [data-pk26="tabs"] .p6-t-let`).first().click(); await page.waitForTimeout(500);
    await to(page, null); await shot(page, "10-letters-tab", W);
    await to(page, '[data-pk40="tpm"]'); await shot(page, "11-letters-tracking", W);
    await page.locator(`${pg} [data-pk26="tabs"] .p6-t-syn`).first().click(); await page.waitForTimeout(500);
    await to(page, '[data-pk40="tpm"]'); await shot(page, "12-synopses-tracking", W);
    await page.locator(`${pg} [data-pk26="tabs"] .p6-lead`).first().click(); await page.waitForTimeout(400);
    await to(page, null);
    await page.locator(`${pg} .p6-hd-s`).first().click(); await page.waitForTimeout(700);
    await shot(page, "13-how-it-works", W); await esc(page);
  });
  test(`brand new at ${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    const W = size.width;
    await open(page, size, "pk40-new");
    await to(page, null); await shot(page, "14-brand-new-top", W);
    await to(page, '[data-pk40="wbf"]'); await shot(page, "15-brand-new-workbench", W);
    await to(page, '[data-pk40="tp"]'); await shot(page, "16-brand-new-tracking", W);
    await page.locator(`${pg} [data-pk26="tabs"] .p6-t-let`).first().click(); await page.waitForTimeout(500);
    await to(page, '[data-pk40="tpm"]'); await shot(page, "17-brand-new-letters-warming-up", W);
  });
}

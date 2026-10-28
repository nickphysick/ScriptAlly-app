/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.1 — the screenshots beside the pack's 01–10 (design-refs/submission-packages-v39-1/screens/),
 * at 1512 × 982 and 1280 × 832 (01 also at 1920 × 1080), into reports/submission-packages-v39-1/app/. Not a lock: it runs
 * only with PK391_SHOTS=1, so a routine run writes nothing. FIXTURE: seedPk40.mjs (pk40-ms), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-1/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }, { width: 1920, height: 1080 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK391_SHOTS, "screenshots only with PK391_SHOTS=1");
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
const esc = async (page: Page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(500); };
const lbl = (page: Page, id: string) => page.locator(`${pg} [data-pk39="labels"] [data-pkid="${id}"]`).first();

for (const size of SIZES) {
  test(`screens at ${size.width}`, async ({ page }) => {
    test.setTimeout(400_000);
    const W = size.width;
    await open(page, size);
    await to(page, null); await shot(page, "01-top", W);
    if (W === 1920) return;
    await to(page, '[data-pk39="labels"]', 40); await shot(page, "02-builder", W);
    await lbl(page, "pk40-ready").click(); await page.waitForTimeout(500);
    await to(page, '[data-pk39="labels"]', 40); await shot(page, "03-builder-ready", W);
    await lbl(page, "pk40-std").click(); await page.waitForTimeout(500);
    await to(page, null);
    await page.locator(`${pg} [data-pk39="tip-x"]`).first().click(); await page.waitForTimeout(700);
    await shot(page, "04-explainer-dismissed", W);
    await page.locator(`${pg} [data-pk38="labels"] .p9-pkl-new`).first().click(); await page.waitForTimeout(800);
    await shot(page, "05-new-package-drawer", W); await esc(page);
    await to(page, '[data-pk39="labels"]', 40);
    await page.locator(`${pg} [data-pk40="open"] [data-pk39="details"]`).first().click(); await page.waitForTimeout(800);
    await shot(page, "06-details-drawer", W); await esc(page);
    await to(page, '[data-pk38="band"]', 0); await shot(page, "07-results", W);
    await to(page, '[data-pk39="list-pk"]', 140); await shot(page, "08-every-package", W);
    await to(page, '[data-pk38="row-pieces"]', 0); await shot(page, "09-pieces", W);
    await to(page, '[data-pk39="list-pc"]', 140); await shot(page, "10-every-piece", W);
  });
}

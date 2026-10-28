/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 — the screenshots beside the pack's 01–18 (design-refs/submission-packages-v39/screens/), at
 * 1512 × 982 and 1280 × 832, into reports/submission-packages-v39/app/. Not a lock: it runs only with PK39_SHOTS=1, so
 * a routine run writes nothing. FIXTURE: seedPk40.mjs (pk40-ms in use, pk40-new with nothing logged), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { liftMotionSuppression, openRoute } from "./measure";

const DIR = "reports/submission-packages-v39/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK39_SHOTS, "screenshots only with PK39_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { seed(); mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
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
const lbl = (page: Page, id: string) => page.locator(`${pg} [data-pk39="labels"] [data-pkid="${id}"]`).first();

for (const size of SIZES) {
  test(`in use at ${size.width}`, async ({ page }) => {
    test.setTimeout(400_000);
    const W = size.width;
    await open(page, size, "pk40-ms");
    await to(page, null); await shot(page, "01-top", W);
    await to(page, '[data-pk39="labels"]'); await shot(page, "02-builder", W);
    await lbl(page, "pk40-ready").click(); await page.waitForTimeout(500);
    await to(page, '[data-pk39="labels"]'); await shot(page, "03-builder-ready-package", W);
    await lbl(page, "pk40-std").click(); await page.waitForTimeout(500);
    await to(page, '[data-pk39="kicker"]', 40);
    await page.locator(`${pg} [data-pk39="tile"]`).first().click(); await page.waitForTimeout(400);
    await shot(page, "04-icon-colour-picker", W); await esc(page);
    await page.locator(`${pg} [data-pk39="name"]`).first().hover(); await page.locator(`${pg} [data-pk39="name"]`).first().click(); await page.waitForTimeout(300);
    await shot(page, "05-rename-in-place", W); await esc(page);
    await to(page, '[data-pk38="band"]', 0); await shot(page, "06-results-band-packages", W);
    await to(page, '[data-pk39="list-pk"]', 140); await shot(page, "07-every-package", W);
    await to(page, '[data-pk38="row-pieces"]', 0); await shot(page, "08-pieces", W);
    await to(page, '[data-pk39="list-pc"]', 140); await shot(page, "09-every-piece-letters", W);
    await page.locator(`${pg} [data-pk39="list-pc"] [data-rlk="ver"]`).click(); await page.waitForTimeout(400);
    await shot(page, "10-every-piece-versions", W);
    await to(page, ".p9-ag3-f", 400); await shot(page, "11-foot", W);
    await to(page, null);
    /* the guide's miniature animates each step to its end state: let it run, and shoot once it has */
    await liftMotionSuppression(page);
    await page.locator(`${pg} [data-pk39="how"]`).first().click(); await page.waitForTimeout(1200);
    await shot(page, "12-how-it-works-1", W);
    for (const [n, name] of [[2, "13-how-it-works-3"], [1, "14-how-it-works-4"], [1, "15-how-it-works-5"]] as const) {
      for (let i = 0; i < n; i++) await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(2600); await shot(page, name, W);
    }
    await esc(page);
    await page.locator(`${pg} [data-pk38="figures"]`).first().click(); await page.waitForTimeout(800);
    await shot(page, "16-package-drawer", W); await esc(page);
    await page.locator(`${pg} [data-pk39="new"]`).first().click(); await page.waitForTimeout(700);
    await shot(page, "17-new-package-dialog", W); await esc(page);
  });
  test(`brand new at ${size.width}`, async ({ page }) => {
    test.setTimeout(240_000);
    await open(page, size, "pk40-new");
    await to(page, null); await shot(page, "18-brand-new", size.width);
  });
}

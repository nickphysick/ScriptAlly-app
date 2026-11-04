/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 — the screenshots beside the pack's states (design-refs/submission-packages-v41/screens/,
 * drawn at 1512 × 982 and 1280 × 832), into reports/submission-packages-v41/app/. Not a lock: it runs only with
 * PK41_SHOTS=1. `PK41_ONLY=01-top,05-results` takes a subset. FIXTURE: seedPk40.mjs (pk40-ms), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v41/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const ONLY = (process.env.PK41_ONLY ?? "").split(",").filter(Boolean);
const want = (n: string) => !ONLY.length || ONLY.some((o) => n.startsWith(o));
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk41="page"]`;

test.skip(!process.env.PK41_SHOTS, "screenshots only with PK41_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { execFileSync("node", ["tests/e2e/pk41Fixture.mjs", "--show-banner"], { stdio: "pipe" }); if (!process.env.PK41_KEEP) seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }, banner = true) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  await openRoute(page, "/queries/packages", size);
  await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 });
  if (!banner) {
    const x = page.locator('[data-pk41="banner-x"]').first();
    if (await x.count()) await x.click();
  }
  await page.waitForTimeout(1200);
}
const scroller = `[...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk41="page"]'))`;
async function scrollTo(page: Page, sel: string, offset = 0) {
  await page.evaluate(({ sel, offset, sc }) => {
    const s = (0, eval)(sc) as HTMLElement; const el = s?.querySelector(sel) as HTMLElement | null;
    if (s && el) s.scrollTop = el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - offset;
  }, { sel, offset, sc: scroller });
  await page.waitForTimeout(400);
}
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });
const openPkg = async (page: Page, id: string) => { await page.locator(`${pg} [data-pk41-row="${id}"]`).first().click(); await page.waitForTimeout(500); };

for (const size of SIZES) {
  test(`the states at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    seed();
    await open(page, size);
    if (want("01-top")) await shot(page, "01-top", size.width);
    if (want("02-builder-sent")) { await openPkg(page, "pk40-std"); await scrollTo(page, '[data-pk41="builder-frame"]', 40); await shot(page, "02-builder-sent", size.width); }
    if (want("03-builder-draft")) { await openPkg(page, "pk40-draft"); await scrollTo(page, '[data-pk41="builder-frame"]', 40); await shot(page, "03-builder-draft", size.width); }
    if (want("04-builder-ready")) {
      await openPkg(page, "pk40-ready"); await scrollTo(page, '[data-pk41="builder-frame"]', 40);
      await page.locator('[data-pk393-step="let"]').first().hover(); await page.waitForTimeout(300);
      await shot(page, "04-builder-ready-linking", size.width);
    }
    if (want("05-results")) { await scrollTo(page, '[data-pk41="results"]', 60); await shot(page, "05-results", size.width); }
    if (want("06-results-tables")) { await scrollTo(page, '[data-pk41="table-pc"]', 260); await shot(page, "06-results-tables", size.width); }
    if (want("07-drawer-new")) {
      await scrollTo(page, '[data-pk41="header"]', 200);
      await page.locator(`${pg} [data-pk41="new"]`).first().click(); await page.waitForTimeout(700);
      await shot(page, "07-drawer-new", size.width); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    }
    if (want("08-how")) {
      await page.locator(`${pg} [data-pk41="how"]`).first().click(); await page.waitForTimeout(600);
      for (let i = 1; i <= 5; i++) {
        await shot(page, `${7 + i < 10 ? "0" : ""}${7 + i}-how-it-works-${i}`, size.width);
        if (i < 5) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500); }
      }
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    if (want("13-banner")) {
      await scrollTo(page, '[data-pk41="header"]', 400);
      const x = page.locator('[data-pk41="banner-x"]').first();
      if (await x.count()) { await x.click(); await page.waitForTimeout(500); }
      await shot(page, "13-banner-dismissed", size.width);
      /* put the strip back for the next width */
      execFileSync("node", ["tests/e2e/pk41Fixture.mjs", "--show-banner"], { stdio: "pipe" });
    }
    for (const [name, arg] of [["14-no-active-package", "--no-active"], ["15-no-packages", "--no-packages"]] as const) {
      if (!want(name)) continue;
      execFileSync("node", ["tests/e2e/pk41Fixture.mjs", arg], { stdio: "pipe" });
      await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
      await shot(page, name, size.width);
      seed();
    }
  });
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.3 — the screenshots beside the pack's six states (design-refs/submission-packages-v39-3/screens/,
 * drawn at 1300 and 1100), taken at 1512 × 982 and 1280 × 832 into reports/submission-packages-v39-3/app/. Not a lock: it
 * runs only with PK393_SHOTS=1. FIXTURE: seedPk40.mjs (pk40-ms), re-seeded per width (the shots pick pieces), cleaned after.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v39-3/app";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
const pg = `[data-pk26="page"]`;

test.skip(!process.env.PK393_SHOTS, "screenshots only with PK393_SHOTS=1");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); localStorage.setItem("sa.guide.packages-explainer", "1"); } catch { /* */ } });
  await openRoute(page, "/queries/packages", size);
  await page.locator('[data-pk39="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1200);
}
const label = (page: Page, id: string) => page.locator(`${pg} [data-pk39="labels"] [data-pkid="${id}"]`).first();
async function toBuilder(page: Page) {
  await page.evaluate(() => { const sc = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement; const k = sc?.querySelector('[data-pk39="kicker"]'); if (sc && k) sc.scrollTop += k.getBoundingClientRect().top - sc.getBoundingClientRect().top - 24; });
  await page.waitForTimeout(400);
}
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });

for (const size of SIZES) {
  test(`the six states at ${size.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    seed();
    const W = size.width;
    await open(page, size);
    /* 01 · a draft with its version picked: the letter step is open */
    await label(page, "pk40-draft").click(); await page.waitForTimeout(700); await toBuilder(page);
    await page.locator(`${pg} [data-pk393-step="ver"] [role=radio]`).first().click(); await page.waitForTimeout(1600);
    await page.mouse.move(2, 2); await page.waitForTimeout(300); await toBuilder(page);
    await shot(page, "01-draft-letter-step-open", W);
    /* 02 · ready: version and letter in, every step closed */
    await label(page, "pk40-ready").click(); await page.waitForTimeout(800); await toBuilder(page); await page.mouse.move(2, 2);
    await shot(page, "02-ready", W);
    /* 03 · hovering the version step outlines the pages attachment */
    await page.locator(`${pg} [data-pk393-step="ver"] .p93-sh`).first().hover(); await page.waitForTimeout(300);
    await shot(page, "03-hover-version-links-preview", W);
    /* 04 · the synopsis step open */
    await page.locator(`${pg} [data-pk393-step="syn"] [data-pk393="step-head"]`).first().click(); await page.waitForTimeout(400);
    await page.mouse.move(2, 2); await page.waitForTimeout(200);
    await shot(page, "04-synopsis-step-open", W);
    /* 05 · with a synopsis picked */
    await page.locator(`${pg} [data-pk393-step="syn"] [role=radio]`).first().click(); await page.waitForTimeout(1600);
    await page.mouse.move(2, 2); await page.waitForTimeout(300); await toBuilder(page);
    await shot(page, "05-with-synopsis", W);
    /* 06 · a sent package: read-only steps, the note, Make a copy */
    await label(page, "pk40-std").click(); await page.waitForTimeout(800); await toBuilder(page); await page.mouse.move(2, 2);
    await shot(page, "06-sent-package", W);
  });
}

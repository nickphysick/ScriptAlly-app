/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 — THE LOCKS AND THE SHOTS (design-refs/phone-query-sheet-v1), measured on the rendered page at
 * 390 × 784. `PQS_SHOTS=1` writes the build's shots beside the ref's 01–23 into reports/phone-query-sheet-v1/shots.
 *
 * Run (through the slot): npm run e2e:emu -- tests/e2e/phoneQuerySheet.measure.ts --project pixel
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/phone-query-sheet-v1";
const PHONE = { width: 390, height: 784 } as const;
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);
async function signIn(page: Page) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 }); /* the harness's shell check is the desktop's */
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); } catch { /* */ } });
}
async function queries(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/queries/all");
  await page.locator('[data-pa4="qrow"]:visible').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await frame(page, 800);
}
/** opens the first row whose court is `court` (agent · you · closed) */
async function openRow(page: Page, court?: string) {
  const row = page.locator(court ? `[data-pa4="qrow"][data-court="${court}"]:visible` : '[data-pa4="qrow"]:visible').first();
  const id = await row.getAttribute("data-id");
  await row.click();
  await page.locator('[data-pqs="sheet"]').waitFor({ timeout: 15_000 });
  await frame(page, 600);
  return id;
}

test.use({ viewport: PHONE, deviceScaleFactor: 2 });

test("Phone query sheet v1 — first look", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.PQS_LOOK, "PQS_LOOK=1");
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const out = `${DIR}/look`; mkdirSync(out, { recursive: true });
  await signIn(page);
  await queries(page);
  await openRow(page, "you");
  await page.screenshot({ path: `${out}/half.png` });
  await page.locator('[data-pqs="grab"]').click(); await frame(page, 600);
  await page.screenshot({ path: `${out}/full.png` });
  for (const k of ["agent", "materials", "notes"]) { await page.locator(`[data-pqs="tab"][data-k="${k}"]`).click(); await frame(page, 400); await page.screenshot({ path: `${out}/tab-${k}.png` }); }
  await page.locator('[data-pqs="more"]').click(); await frame(page, 300);
  await page.screenshot({ path: `${out}/menu.png` });
  await page.locator('[data-pqs="more"]').click(); await frame(page, 200);
  await page.locator('[data-pqs="tab"][data-k="tracking"]').click(); await frame(page, 300);
  /* a query with a logged step to edit (Tom's query step is the query's own record): the first "agent" row */
  await page.locator('[data-pqs="close"]').click(); await frame(page, 500);
  await openRow(page, "agent");
  await page.locator('[data-pqs="bubble"] [data-pqs="pen"]').first().click(); await frame(page, 600);
  await page.screenshot({ path: `${out}/step-edit.png` });
  expect(await page.locator('[data-pqs="sheet"]').count()).toBe(1);
});

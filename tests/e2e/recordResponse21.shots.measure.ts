/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2.1 — THE SHOTS for the compare sheet against design-refs/record-a-response-v2-1/screens (1440 × 900,
 * 2x), named as the reference names them. No assertions: tests/e2e/recordResponse21.measure.ts holds the locks.
 *
 *   01 recorded, partial sent (a reminder)       05 partial sent, a reply date and no reminder
 *   04 recorded, full sent                       06 partial sent, no reply date
 *   07 partial not sent (unchanged)              02 / 03 whole page: the card over the journey, then the journey back
 *
 * Each recording is undone in the same run. ⚠️ EMULATOR ONLY:
 * `npm run e2e:emu -- tests/e2e/recordResponse21.shots.measure.ts --project=measure`; then
 * `node tests/e2e/rar21compare.mjs design-refs/record-a-response-v2-1/screens reports/record-a-response-v2-1/after reports/record-a-response-v2-1/compare 7`.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const OUT = "reports/record-a-response-v2-1/after";
const VP = { width: 1440, height: 900 };
test.use({ deviceScaleFactor: 2 });
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const R = (k: string) => `[data-rar="root"] [data-rar="${k}"]`;
const click = (page: Page, k: string) => page.locator(R(k)).first().click();
const panelShot = async (page: Page, name: string) => { mkdirSync(OUT, { recursive: true }); await settle(page, 700); await page.locator('[data-side-panel][data-rar="panel"]').screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" }); };
const wholeShot = async (page: Page, name: string) => { mkdirSync(OUT, { recursive: true }); await settle(page, 900); await page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" }); };

async function openFromDashboard(page: Page) {
  await openApp(page, "/dashboard", VP);
  await page.locator("[data-d2='record']").filter({ visible: true }).first().click();
  await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await settle(page);
}
async function recordOne(page: Page, k: "pr" | "fr", sent: "yes" | "no", reply: "nudge" | "date" | "unknown" = "nudge") {
  await openFromDashboard(page);
  const row = page.locator(`${R("who-row")}[data-status="Queried"]`).first();
  await row.waitFor({ timeout: 10_000 });
  await row.click(); await settle(page);
  await page.locator(`${R("kind")}[data-k="${k}"]`).click(); await settle(page);
  await page.locator(`${R("when-opt")}[data-k="today"]`).click(); await settle(page);
  await click(page, "asked-go"); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="${sent}"] > button`).click(); await settle(page);
  if (sent === "yes") {
    if (reply === "unknown") { await page.locator(`${R("slider")}[data-k="wk"] .sa-wk-unkbtn`).click(); await settle(page); }
    if (reply === "date") { await click(page, "nudge"); await settle(page); }
    await click(page, "sent-go"); await settle(page);
    await click(page, "went-ask"); await settle(page);
  } else { await click(page, "sent-go"); await settle(page); }
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 10_000 });
  await click(page, "record");
  await page.locator('[data-rar="root"][data-step="done"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
}
async function undoAndLeave(page: Page) {
  await click(page, "undo");
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
  await page.keyboard.press("Escape"); await settle(page, 300);
  if (await page.locator(R("leave-discard")).count()) { await page.locator(R("leave-discard")).click(); await settle(page, 700); }
}

test.beforeEach(async ({ page }) => { await page.setViewportSize(VP); });

test("the seven v2.1 screens", async ({ page }) => {
  test.setTimeout(900_000);
  await recordOne(page, "pr", "yes", "nudge");
  await panelShot(page, "01-recorded-partial-sent");
  await click(page, "open-card");
  await page.locator('[data-side-panel][data-qp="panel"]').first().waitFor({ timeout: 15_000 });
  await wholeShot(page, "02-card-over-journey-whole-page");
  await page.keyboard.press("Escape");
  await page.locator('[data-side-panel][data-qp="panel"]').first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
  await wholeShot(page, "03-card-closed-journey-back-whole-page");
  await undoAndLeave(page);
  await recordOne(page, "fr", "yes", "nudge");
  await panelShot(page, "04-recorded-full-sent");
  await undoAndLeave(page);
  await recordOne(page, "pr", "yes", "date");
  await panelShot(page, "05-recorded-partial-sent-no-reminder");
  await undoAndLeave(page);
  await recordOne(page, "pr", "yes", "unknown");
  await panelShot(page, "06-recorded-partial-sent-no-reply-date");
  await undoAndLeave(page);
  await recordOne(page, "pr", "no");
  await panelShot(page, "07-recorded-partial-not-sent-unchanged");
  await undoAndLeave(page);
});

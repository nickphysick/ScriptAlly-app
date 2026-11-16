/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card offers v1 merge — the ref's notes-card scenarios, the mock beside the app, at 1440 and 1280, and the save bar
 * after each choice. Screens only: no lock, nothing asserted beyond each scenario having opened.
 *
 *   rt   "Change her response time"     co1-rt, How: 8 → 6 weeks
 *   cq   "Close her to queries"          co1-rt, How: Closed (within her window: Leave it open is suggested)
 *   cp   "…with an old, silent query"    co1-old, How: Closed (past her date, NRN: Close it as no reply is suggested)
 *   cf   "…with a full requested"        co1-full, How: Closed (the calm note, no options)
 *   web  "+ Website"                     co1-full, + Website
 *
 * ⚠️ EMULATOR ONLY (co1Emu.mjs seeds the four co1 agents). Nothing is saved: every edit is discarded.
 */
import { test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/card-offers-v1-merge/shots";
const MOCK = `file://${resolve("design-refs/card-offers-v1/agent-card-edit-v8.html")}`;
const SIZES = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }];
const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/co1Emu.mjs", cmd], { encoding: "utf8" }).trim();

async function openCard(page: Page, id: string, vp: { width: number; height: number }): Promise<Locator> {
  await openApp(page, `/agents?agent=${id}`, vp);
  await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  const panel = page.locator(`[data-cl262='panel'][data-agent-id='${id}']`);
  await panel.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(900);
  return panel;
}
async function editHow(page: Page, panel: Locator) {
  await panel.locator(".cl262-sec[data-k='how'] [data-cl262='pen']").evaluate((e) => (e as HTMLElement).click());
  await panel.locator(".cl262-sec[data-k='how'].is-edit").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
}
async function weeksBy(page: Page, panel: Locator, n: number) {
  const r = panel.locator(".cl262-sec[data-k='how'] [data-aap='weeks'] input[type='range']");
  await r.focus();
  for (let i = 0; i < Math.abs(n); i++) await page.keyboard.press(n < 0 ? "ArrowLeft" : "ArrowRight");
  await page.waitForTimeout(400);
}
async function closeDoor(page: Page, panel: Locator) {
  await panel.locator(".cl262-sec[data-k='how'] [data-aap='door'] [data-door='closed']").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(500);
  if (await page.locator("[data-ae='calendar']").count()) await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
}
/** the offer in view in the card's scroller, then the shot */
async function shot(page: Page, panel: Locator, name: string) {
  await panel.locator("[data-co='rt'], [data-co='close'], [data-co='safe'], input[data-ae='website']:focus").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

mkdirSync(DIR, { recursive: true });
test.beforeEach(() => { emu("seed"); });
test.afterAll(() => { try { emu("clean"); } catch { /* the emulator is gone with the run */ } });

for (const vp of SIZES) {
  const w = vp.width;
  test(`the mock's five scenarios · ${w}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(vp);
    for (const k of ["rt", "cq", "cp", "cf", "web"]) {
      await page.goto(MOCK);
      await page.waitForTimeout(400);
      await page.locator(`[data-try='${k}']`).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/${k}-mock-${w}.png` });
    }
  });

  test(`the app's five scenarios, and the save bar after each choice · ${w}`, async ({ page }) => {
    test.setTimeout(400_000);
    /* rt: 8 → 6, then each choice */
    let panel = await openCard(page, "co1-rt", vp);
    await editHow(page, panel);
    await weeksBy(page, panel, -2);
    await shot(page, panel, `rt-app-${w}`);
    await page.screenshot({ path: `${DIR}/bar-update-${w}.png` });
    await panel.locator("[data-co='rt-keep']").click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${DIR}/bar-keep-${w}.png` });
    /* cq: closed within her window, the suggestion (Leave it open), then Close it as no reply */
    panel = await openCard(page, "co1-rt", vp);
    await editHow(page, panel);
    await closeDoor(page, panel);
    await shot(page, panel, `cq-app-${w}`);
    await page.screenshot({ path: `${DIR}/bar-stays-open-${w}.png` });
    await panel.locator("[data-co='close-close']").click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${DIR}/bar-closes-${w}.png` });
    /* cp: the old, silent query */
    panel = await openCard(page, "co1-old", vp);
    await editHow(page, panel);
    await closeDoor(page, panel);
    await shot(page, panel, `cp-app-${w}`);
    /* cf: a full requested */
    panel = await openCard(page, "co1-full", vp);
    await editHow(page, panel);
    await closeDoor(page, panel);
    await shot(page, panel, `cf-app-${w}`);
    /* web: + Website */
    panel = await openCard(page, "co1-full", vp);
    await panel.locator("[data-cl262='add-website']").click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/web-app-${w}.png` });
  });
}

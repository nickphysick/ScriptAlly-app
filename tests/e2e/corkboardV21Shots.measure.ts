/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v2.1 — the build's screens beside the ref's eight (design-refs/corkboard-v14/screens), at 1512 × 982.
 * Not a lock: it only photographs. CB21_SHOTS=1 to run.
 *
 *   CB21_SHOTS=1 npm run e2e:emu -- tests/e2e/corkboardV21Shots.measure.ts --project=measure
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { PAGE, PREFIX, ROUTE, only, open, seeder } from "./cb2Lib";

const OUT = "reports/corkboard-v2-1/shots";
const VP = { width: 1512, height: 982 };
const SNAP = "reports/corkboard-v2-1/prefs-shots.json";
const TAG = (l: string) => `${PREFIX}tag-${l}`;

test.skip(!process.env.CB21_SHOTS, "set CB21_SHOTS=1 to photograph");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(OUT, { recursive: true }); seeder("snap", SNAP); });
test.afterAll(() => { seeder("clean"); seeder("restore", SNAP); });

const view = async (page: Page, v: "board" | "piles") => { await page.locator(`${PAGE} [data-view="${v}"]`).click(); await page.waitForTimeout(800); };
const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

test("shots", async ({ page }) => {
  test.setTimeout(240_000);
  await only(page);
  /* the few-notes board (01, 02, 03, 04, 05) */
  seeder("few");
  await open(page, ROUTE, VP);
  await view(page, "board");
  await shot(page, "01-few-board-1512");
  await view(page, "piles");
  await shot(page, "02-few-piles-1512");
  await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
  await page.locator('[data-cb2="start-pile"] [data-cb2="pile-name-in"]').fill("agents");
  await page.locator(`[data-cb2="start-pile"] [data-pick="${PREFIX}f2"] input`).check();
  await page.waitForTimeout(300);
  await shot(page, "03-start-pile-1512");
  await page.keyboard.press("Escape");
  seeder("droptag", "agents");
  await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
  await page.locator('[data-cb2="start-pile"] [data-cb2="pile-name-in"]').fill("agents");
  await page.locator('[data-cb2="start-pile"] [data-cb2="start-save"]').click();
  await page.waitForTimeout(1500);
  await shot(page, "04-empty-pile-open-1512");
  await page.locator(`${PAGE} [data-cb2="add-notes"]`).click();
  await page.locator(`[data-cb2="start-pile"] [data-pick="${PREFIX}f2"] input`).check();
  await page.waitForTimeout(300);
  await shot(page, "05-add-notes-1512");
  await page.keyboard.press("Escape");
  seeder("droptag", "agents");
  /* the populated board (06, 07, 08) */
  seeder("seed");
  await open(page, ROUTE, VP);
  await view(page, "piles");
  await shot(page, "06-piles-1512");
  await page.locator(`${PAGE} [data-pile="${TAG("agents")}"]`).click();
  await page.waitForTimeout(600);
  const nid = await page.locator(`${PAGE} [data-cb2-note]`).first().getAttribute("data-cb2-note");
  await page.locator(`${PAGE} [data-cb2-note="${nid}"]`).hover();
  await page.locator(`${PAGE} [data-cb2-note="${nid}"] [data-cb2="more"]`).click();
  await page.waitForTimeout(300);
  await shot(page, "07-menu-new-pile-1512");
  await page.keyboard.press("Escape");
  await page.locator(`${PAGE} [data-cb2="all-piles"]`).click();
  await view(page, "board");
  await page.locator(`${PAGE} [data-cb2="ghost-new"]`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, "08-board-ghost-1512");
});

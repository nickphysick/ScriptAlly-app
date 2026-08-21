/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pictures for the report — the one door in both panes, both empty states, and the Tasks
 * section it was taken out of. Shots only; every claim they illustrate is measured in
 * `setAside.measure.ts`.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const DOOR = 'button[aria-label="Set aside and tags"]';
const OUT = "reports/set-aside";

const open = async (page: import("@playwright/test").Page, tab?: string) => {
  await page.locator(DOOR).click();
  await page.waitForTimeout(500);
  if (tab) { await page.locator(`.sap-tab:has-text("${tab}")`).click(); await page.waitForTimeout(350); }
};

test("the door, both panes", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await open(page);
  await page.screenshot({ path: `${OUT}/door-set-aside.png` });
  await page.locator('.sap-tab:has-text("Tags")').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/door-tags.png` });
  await page.keyboard.press("Escape");
});

test("the narrowed Tasks section", async ({ page }) => {
  await openRoute(page, "/account/tasks", { width: 1440, height: 900 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/account-tasks.png`, fullPage: true });
});

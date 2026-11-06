/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v2 — screenshots of the build beside the ref's screens (reports/corkboard-v2/shots/). Not a lock: it
 * asserts only that the page rendered. Seeds the fixture, shoots, and cleans up in the same run.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, ROUTE, only, open, openPhone, seeder } from "./cb2Lib";

const SHOTS = `${DIR}/shots`;

test.describe("CB2 shots", () => {
  test.skip(!process.env.CB2_SHOTS, "set CB2_SHOTS=1 to take the report's screenshots");
  const SNAP = `${DIR}/prefs-shots.json`;
  test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seeder("snap", SNAP); seeder("seed"); });
  test.afterAll(() => { seeder("clean"); seeder("restore", SNAP); });

  test("board at 1512 and 1280", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page);
    for (const vp of [{ width: 1512, height: 982 }, { width: 1280, height: 800 }]) {
      await open(page, ROUTE, vp);
      await expect(page.locator('.cb2:visible [data-cb2="header"]')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/01-board-${vp.width}.png` });
    }
  });

  test("piles, and a pile open", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page);
    await open(page, ROUTE, { width: 1512, height: 982 });
    await page.locator('.cb2:visible [data-view="piles"]').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/02-piles-1512.png` });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/02-piles-1280.png` });
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.waitForTimeout(500);
    await page.locator('.cb2:visible .cb2-pile', { hasText: "#agents" }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/03-pile-open-1512.png` });
    await page.locator('.cb2:visible [data-view="board"]').click();
  });

  test("the note pop-up and Add a task", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page);
    await open(page, ROUTE, { width: 1512, height: 982 });
    await page.locator('.cb2:visible [data-cb2="new-note"]').click();
    await page.locator('[data-cb2="note-text"]').fill("Check the Harlow window opens on the 1st");
    await page.locator('[data-cb2="note-dialog"] [data-paper="powder"]').click();
    await page.locator('[data-cb2="add-link"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/04-new-note-1512.png` });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.locator('.cb2:visible [data-cb2="add-task"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/06-add-task-1512.png` });
    await page.keyboard.press("Escape");
  });

  test("empty, and the phone", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page, "cb2none-");
    await open(page, ROUTE, { width: 1512, height: 982 });
    await page.screenshot({ path: `${SHOTS}/09-empty-1512.png` });
  });

  test("the phone at 390", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page);
    await openPhone(page, ROUTE);
    await page.screenshot({ path: `${SHOTS}/10-phone-390.png`, fullPage: false });
  });

  test("the menu, Turn into a task, and the linked filter", async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await only(page);
    await open(page, ROUTE, { width: 1512, height: 982 });
    const card = page.locator('.cb2:visible [data-cb2-note="cb2seed-n12"]');
    await card.hover();
    await card.locator('[data-cb2="more"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/05-menu-1512.png` });
    await page.locator('[data-cb2="menu"] [data-act="task"]').click();
    await page.locator('[data-cb2="turn-dialog"] [data-when="next"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/07-turn-into-task-1512.png` });
    await page.keyboard.press("Escape");
    await page.locator('.cb2:visible [data-glance="linked"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/08-filter-linked-1512.png` });
  });
});

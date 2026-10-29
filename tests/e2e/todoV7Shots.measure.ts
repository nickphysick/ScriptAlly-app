/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v7 — the report's shots, named as `design-refs/todo-list-v7/screens/*` (01–09) at 1512 × 900 and 1280 × 800,
 * so each can be set beside the ref's. `TD7_SHOTS=1` only. Writes nothing to the account (the compose card is opened
 * and closed unsaved; the drawer reads).
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openTodo } from "./td52Lib";

const OUT = "reports/todo-list-v7/shots";
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };
test.skip(process.env.TD7_SHOTS !== "1", "TD7_SHOTS=1 writes the report's shots");
test.setTimeout(900_000);

const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const toTop = (page: Page) => page.evaluate(() => { (window as unknown as W).__td5().sc.scrollTop = 0; });
/* the ref's tray screens put the "Your tray" heading's foot just under the shell's bar: the sheet near the top */
const toTray = (page: Page) => page.evaluate(() => { const { sc, q } = (window as unknown as W).__td5(); sc.scrollTop += q(".td5-sheet")!.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10; });
const snap = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);

for (const vp of SIZES) test(`shots @${vp.width}`, async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const w = vp.width;
  await openTodo(page, vp);
  await page.evaluate(() => document.fonts.ready);
  await toTop(page); await settle(page, 800);
  await snap(page, "01-top", w);
  await toTray(page); await settle(page);
  await snap(page, "02-tray", w);
  await page.locator('[data-todo-v5] [data-td7="filters"]').click(); await settle(page, 300);
  await snap(page, "03-filters-open", w);
  await page.locator('[data-todo-v5] [data-td7="filters"]').click(); await settle(page, 300);
  await page.locator('[data-todo-v5] [data-td52="pin"]').click(); await settle(page, 1000);
  await snap(page, "04-pinned", w);
  await page.locator('[data-todo-v5] [data-td52="pin"]').click(); await settle(page, 1000);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click(); await settle(page, 700);
  await toTray(page); await settle(page);
  await snap(page, "05-set-aside", w);
  await page.locator('[data-todo-v5] [data-td7="back-to-tray"]').click(); await settle(page);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="add"]').click(); await settle(page, 900);
  await snap(page, "06-add-task", w);
  await page.keyboard.press("Escape"); await settle(page);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="open-calendar"]').click(); await settle(page, 900);
  await snap(page, "07-calendar-drawer", w);
  await page.keyboard.press("Escape"); await settle(page);
  await openTodo(page, vp, { state: "caught" });
  await toTop(page); await settle(page, 800);
  await snap(page, "08-caught-up", w);
  await openTodo(page, vp, { state: "nothing" });
  await toTop(page); await settle(page, 800);
  await snap(page, "09-nothing-yet", w);
});

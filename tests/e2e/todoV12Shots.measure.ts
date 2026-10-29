/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 — the report's shots, named as `design-refs/todo-list-v12/screens/*` (01–13) at 1512 × 900 and
 * 1280 × 800, so each can be set beside the ref's. `TD12_SHOTS=1` only. Writes nothing to the account: the compose card is
 * opened and closed unsaved, the journey is opened on the desk and left with no answers, the drawer reads.
 * ⚠️ THE QUIET STATES OPEN ON A FRESH PAGE: `openTodo`'s review state is an init script, and init scripts pile up.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openTodo } from "./td52Lib";

const OUT = "reports/todo-list-v12/shots";
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };
test.skip(process.env.TD12_SHOTS !== "1", "TD12_SHOTS=1 writes the report's shots");
test.setTimeout(900_000);

const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const toTop = (page: Page) => page.evaluate(() => { (window as unknown as W).__td5().sc.scrollTop = 0; });
const toTray = (page: Page) => page.evaluate(() => { const { sc, q } = (window as unknown as W).__td5(); sc.scrollTop += q(".td5-sheet")!.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10; });
/* the ref's "Everything else" screens scroll the sheet up under the bar; its 11 scrolls the caught-up page to Coming up */
const toSel = (page: Page, sel: string, d = 24) => page.evaluate(([sel, d]) => { const { sc, q } = (window as unknown as W).__td5(); const e = q(sel as string); if (e) sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - (d as number); }, [sel, d] as const);
const snap = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);

for (const vp of SIZES) test(`shots @${vp.width}`, async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const w = vp.width;
  await openTodo(page, vp);
  await page.evaluate(() => document.fonts.ready);
  await toTop(page); await settle(page, 800);
  await snap(page, "01-populated-top", w);
  await toTray(page); await settle(page);
  await snap(page, "02-populated-workspace", w);
  await page.locator('[data-todo-v5] [data-td7="filters"]').click(); await settle(page, 300);
  await snap(page, "03-filters-open", w);
  await page.locator('[data-todo-v5] [data-td7="filters"]').click(); await settle(page, 300);
  /* 04: a Needs you now card on the desk (its press, which also brings the page down to the workspace) */
  await toTop(page); await settle(page);
  await page.locator('[data-todo-v5] [data-td12-card] [data-td12="deed"]').first().click(); await settle(page, 1200);
  await snap(page, "04-card-on-desk", w);
  /* 05: a Your move card's button: its journey on the desk */
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td12-card][data-g="you"] [data-td12="go"]').first().click(); await settle(page, 1800);
  await snap(page, "05-task-in-progress", w);
  await page.keyboard.press("Escape"); await settle(page, 400); await page.keyboard.press("Escape"); await settle(page, 400);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td52="pin"]').click(); await settle(page, 1000);
  await snap(page, "06-pinned", w);
  await page.locator('[data-todo-v5] [data-td52="pin"]').click(); await settle(page, 1000);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="aside"]').click(); await settle(page, 700);
  await toTray(page); await settle(page);
  await snap(page, "07-set-aside", w);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td7="header"] [data-td5="add"]').click(); await settle(page, 900);
  await snap(page, "08-add-task", w);
  await page.keyboard.press("Escape"); await settle(page);
  await openTodo(page, vp);
  await page.locator('[data-todo-v5] [data-td12="calendar"]').click(); await settle(page, 900);
  await snap(page, "09-calendar-drawer", w);
  await page.keyboard.press("Escape"); await settle(page);
  for (const [st, names] of [["caught", ["10-caught-up", "11-caught-up-coming-up"]], ["nothing", ["12-nothing-yet", "13-nothing-yet-example"]]] as const) {
    const p = await page.context().newPage();
    await openTodo(p, vp, { state: st });
    await p.evaluate(() => document.fonts.ready);
    await toTop(p); await settle(p, 800);
    await snap(p, names[0], w);
    await toSel(p, st === "caught" ? '[data-td12="coming-up"]' : '[data-td12="example"]'); await settle(p, 600);
    await snap(p, names[1], w);
    await p.close();
  }
});

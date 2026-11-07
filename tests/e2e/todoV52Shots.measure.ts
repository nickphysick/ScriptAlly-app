/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v52 — the report's screens, beside design-refs/todo-list-v52/screens/01–17, at 1512 × 982 and 1280 × 800.
 * Reads only, except 05 (the celebration): it logs a send and presses Undo in the same run.
 * Run against the emulator with `npm run dev:emu` serving; writes to reports/todo-list-v52/screens/.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/todo-list-v52/screens";
mkdirSync(OUT, { recursive: true });
const PG = '[data-tws="page"]:visible';

async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.removeItem("sa.todoTraySlim"); } catch { /* */ } });
  await openRoute(page, "/todo", vp);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}
const prim = (page: Page) => page.locator(`${PG} [data-tws="primary"]`);
const row = (page: Page, re: RegExp) => page.locator(`${PG} [data-tws-row]`).filter({ hasText: re }).first();

for (const vp of [{ width: 1512, height: 982 }, { width: 1280, height: 800 }]) {
  test(`the screens at ${vp.width}`, async ({ page }) => {
    test.setTimeout(300_000);
    const shot = async (n: string) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` }); };
    await open(page, vp);
    /* 01–05 · a send */
    await row(page, /^Send .* your full/).click();
    await shot("01-workspace");
    await page.locator(`${PG} .tws-q .tws-tile`).last().click();
    await shot("02-option-picked");
    await prim(page).click();
    await page.waitForTimeout(250);
    if (!(await prim(page).isEnabled())) await page.locator(`${PG} .tws-q .tws-tile`).first().click();
    await prim(page).click();
    await page.waitForTimeout(250);
    await page.locator(`${PG} .tws-q [aria-label="An older date"]`).click();
    await shot("03-date-calendar");
    await prim(page).click();
    await shot("04-summary-log-it");
    await prim(page).click();
    await expect(page.locator(`${PG} [data-tws="yay"]`)).toBeVisible({ timeout: 15_000 });
    await shot("05-logged");
    await page.locator(`${PG} [data-tws="yay"]`).getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(1500);
    /* 06–07 · gone quiet */
    await row(page, /gone quiet/).click();
    await shot("06-gone-quiet");
    await page.locator(`${PG} .tws-q .tws-tile`).filter({ hasText: /nudge/i }).first().click();
    await prim(page).click();
    await shot("07-gone-quiet-nudge");
    /* 08 · an offer */
    await row(page, /^Answer .* offer/).click();
    await shot("08-offer");
    /* 09 · a reply time, set to 10 weeks */
    const more = page.locator(`${PG} .tws-more`);
    if (await more.count()) await more.first().click();
    await row(page, /take to reply/).click();
    const r = page.locator(`${PG} .tws-q input[type="range"]`);
    await r.focus(); await page.keyboard.press("Home");
    for (let i = 1; i < 10; i++) await page.keyboard.press("ArrowRight");
    await shot("09-reply-time");
    /* 10 · your own task */
    const own = page.locator(`${PG} [data-tws-row]`).filter({ has: page.locator('[data-k="own"]') }).first();
    await own.click();
    await shot("10-own-task");
    /* 11 · the tray collapsed */
    await row(page, /^Send .* your full/).click();
    await page.locator(`${PG} [data-tws="collapse"]`).click();
    await shot("11-tray-collapsed");
    await page.locator(`${PG} [data-tws="expand"]`).click();
    /* 12–13 · the pop-ups */
    await page.locator(`${PG} [data-tws="footer"] .tws-sb`).first().click();
    await shot("12-snooze");
    await page.keyboard.press("Escape");
    await page.locator(`${PG} [data-tws="footer"] .tws-sb`).nth(1).click();
    await shot("13-dismiss");
    await page.keyboard.press("Escape");
    /* 14 · housekeeping */
    await page.locator(`${PG} [data-tws="list"]`).evaluate((l: HTMLElement) => { const h = l.querySelector<HTMLElement>('.tws-gb[data-band="house"]'); if (h) l.scrollTop = h.offsetTop - l.offsetTop - 10; });
    await shot("14-housekeeping");
    /* 15–16 · the tabs */
    await page.locator(`${PG} .tws-seg button`, { hasText: "Snoozed" }).click();
    await shot("15-snoozed-tab");
    await page.locator(`${PG} .tws-seg button`, { hasText: "Done" }).click();
    await shot("16-done-tab");
    await page.locator(`${PG} .tws-seg button`, { hasText: "To do" }).click();
    /* 17 · hovering the preview */
    await row(page, /^Send .* your full/).click();
    await page.locator(`${PG} [data-tws="preview"]`).hover();
    await shot("17-preview-hover");
  });
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 — the report's screenshots, beside each `design-refs/todo-list-v5/screens/*` at both widths.
 * `TD5_SHOTS=1` writes them; a routine run writes none. Nothing here asserts; the locks are todoV5.measure.ts.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/todo-list-v5/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

for (const vp of SIZES) {
  test(`shots ${vp.width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript(() => { try { for (const k of ["todo", "contacts", "queries"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/todo", vp);
    await page.waitForSelector(".td5-root[data-state='list'], .td5-root[data-state='caught'], .td5-root[data-state='nothing']", { timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/01-top-${vp.width}.png` });
    await page.evaluate(() => {
      const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
      const sh = document.querySelector<HTMLElement>(".td5-sheet");
      if (s && sh) s.scrollTop = sh.offsetTop - 0 + 2;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/02-tray-and-desk-${vp.width}.png` });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop += 700; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/02b-scrolled-${vp.width}.png` });
  });
}

for (const st of ["caught", "nothing"] as const) {
  for (const vp of SIZES) {
    test(`shots ${st} ${vp.width}`, async ({ page }) => {
      test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
      mkdirSync(DIR, { recursive: true });
      await page.addInitScript((s) => { (window as unknown as { __SA_TD5_STATE?: string }).__SA_TD5_STATE = s; }, st);
      await openRoute(page, "/todo", vp);
      await page.waitForSelector(`.td5-root[data-state='${st}']`, { timeout: 30_000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${DIR}/${st === "caught" ? "07-caught-up" : "08-empty"}-${vp.width}.png` });
      if (st === "nothing") {
        await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".td5-root .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = 900; });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${DIR}/09-empty-lower-${vp.width}.png` });
      }
    });
  }
}

for (const vp of SIZES) {
  test(`shots interactions ${vp.width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript(() => { try { for (const k of ["todo", "contacts", "queries"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/todo", vp);
    await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
    await page.waitForTimeout(800);
    const sc = () => page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); const sh = document.querySelector<HTMLElement>(".td5-sheet"); if (s && sh) s.scrollTop += sh.getBoundingClientRect().top - s.getBoundingClientRect().top + 2; });
    /* 03 · the drawer, opened from the desk (untouched, then closed: nothing written) */
    await page.locator('[data-todo-v5] [data-td5="row"][data-bucket="send"]').first().click();
    await sc(); await page.waitForTimeout(300);
    await page.locator('[data-todo-v5] [data-td5="act"]').click();
    await page.locator("[data-qad-drawer]").first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/03-drawer-${vp.width}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(800);
    /* 05 · filtered to To chase */
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = 0; });
    await page.locator('[data-todo-v5] [data-td5="card-row"][data-k="chase"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/05-filtered-${vp.width}.png` });
    await page.locator('[data-todo-v5] [data-td5="card-row"][data-k="chase"]').click();
    /* 06 · just the desk */
    await sc(); await page.waitForTimeout(300);
    await page.locator('[data-todo-v5] [data-td5="focus"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/06-just-the-desk-${vp.width}.png` });
    await page.locator('[data-todo-v5] [data-td5="focus"]').click();
    /* the composer drawer */
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop = 0; });
    await page.locator('[data-todo-v5] [data-td5="add"]').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/composer-${vp.width}.png` });
  });
}

for (const width of [1920, 1024]) {
  test(`shots ${width}`, async ({ page }) => {
    test.skip(process.env.TD5_SHOTS !== "1", "TD5_SHOTS=1 writes the report's screenshots");
    mkdirSync(DIR, { recursive: true });
    await openRoute(page, "/todo", { width, height: 1000 });
    await page.waitForSelector(".td5-root[data-state='list']", { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/todo-${width}.png` });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>("[data-todo-v5] .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); const sh = document.querySelector<HTMLElement>(".td5-sheet"); if (s && sh) s.scrollTop += sh.getBoundingClientRect().top - s.getBoundingClientRect().top + 2; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/todo-${width}-sheet.png` });
  });
}

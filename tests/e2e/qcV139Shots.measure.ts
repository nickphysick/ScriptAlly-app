/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 — the report's screenshots, at 1512 × 900 and 1280 × 800: the checklist, each step's card, Pip at
 * every card for a partial and for a pass, the all-done state, and the band icons under each grouping. Writes
 * reports/qc-v139/shots/. Asserts only that each state was reached. Puts the guide's state back when it is done.
 * (The empty account cannot be shot: the shared harness account has queries. A3 is a unit lock.)
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const OUT = "reports/qc-v139/shots";
const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

async function open(page: Page, vp: { width: number; height: number }, guide: unknown) {
  flags(`--restore '${JSON.stringify(guide)}'`);
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.removeItem("sa.pinList.queries"); localStorage.setItem("sa.qcList.v1", JSON.stringify({ v: 2, density: "comfortable", group: "attention" })); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
}
const pill = async (page: Page) => { if (!(await page.locator("[data-pck='popover']").count())) await page.locator("[data-pck='pill']").first().click(); await page.waitForTimeout(500); };
const card = (page: Page, id: string) => page.waitForFunction((x) => {
  const f = document.querySelector<HTMLElement>("[data-pck='flow']"); const c = f?.querySelector<HTMLElement>("[data-pck='card']");
  return f?.dataset.flow === x && !!c && getComputedStyle(c).visibility !== "hidden";
}, id, { timeout: 8000 }).then(() => true).catch(() => false);
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);

test("v139 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    await open(page, vp, { seen: true });
    await pill(page);
    await page.screenshot({ path: `${OUT}/${w}-01-checklist.png` });
    for (const [k, n] of [["log", "02-step-log"], ["find", "03-step-find"], ["open", "04-step-open"], ["birds", "06-step-birds"]] as const) {
      await pill(page);
      await page.locator(`[data-pck='item'][data-k='${k}'] button`).click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${w}-${n}.png` });
      if (k === "log") {
        /* a real press (pointerdown ends the step's spotlight, as a writer's press does) */
        await page.locator("[data-qcv='oh-log']").first().click();
        await card(page, "log-2");
        await page.screenshot({ path: `${OUT}/${w}-02b-step-log-journey.png` });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1500);
      } else {
        await page.mouse.click(5, 400);
        await page.waitForTimeout(400);
      }
    }
    for (const kind of [["partial", "Partial requested"], ["pass", "Pass"]] as const) {
      await open(page, vp, { seen: true });
      await pill(page);
      await page.locator("[data-pck='item'][data-k='resp'] button").click();
      expect(await card(page, "pip-1")).toBe(true);
      await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-1-band.png` });
      await press(page, "[data-qc139='practice'] [data-qcv='row']");
      await card(page, "pip-2");
      await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-2-button.png` });
      await press(page, "[data-qp='panel'] [data-door='resp']");
      await card(page, "pip-3");
      await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-3-answer.png` });
      await page.locator(".qad-root.is-open button", { hasText: kind[1] }).first().click();
      await page.waitForTimeout(400);
      let i = 4;
      for (; i < 9; i++) {
        if (await page.locator(".qad-root.is-open button", { hasText: /^Save response/ }).count()) break;
        await page.locator(".qad-root.is-open button", { hasText: /^Next/ }).first().click();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-${i}-step.png` });
      }
      await page.locator(".qad-root.is-open button", { hasText: /^Save response/ }).first().click();
      expect(await card(page, "pip-done")).toBe(true);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-${i}-done.png` });
      await press(page, "[data-qc139='clear-pip']");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${w}-05-${kind[0]}-${i + 1}-cleared.png` });
    }
  }
});

test("v139 shots: all done and the bands", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    /* the harness loads the page twice to sign in, and the first load of an all-done account writes \`finished\` — which
       the second rightly reads as "the next visit". So: open, put back all-done-but-not-finished, and reload once. */
    const ALL = { seen: true, done: { log: true, find: true, open: true, resp: true, birds: true } };
    await open(page, vp, ALL);
    flags(`--restore '${JSON.stringify(ALL)}'`);
    await page.reload();
    await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await pill(page);
    await page.screenshot({ path: `${OUT}/${w}-09-all-done.png` });
    await page.keyboard.press("Escape");
    for (const label of ["Status", "Next action", "Submission package", "Who it's with"]) {
      await page.locator(".qc138-sheet [data-ltb='group-name']").first().click();
      await page.waitForTimeout(300);
      await page.locator("[data-qc138='group-menu'] button", { hasText: label }).first().click();
      await page.waitForTimeout(900);
      await page.evaluate(() => { const b = document.querySelector<HTMLElement>(".qc138-sheet [data-qcv='gband']"); const sc = b?.closest<HTMLElement>(".wpg-scroll"); if (b && sc) sc.scrollTop += b.getBoundingClientRect().top - 220; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${w}-10-bands-${label.replace(/\W+/g, "").toLowerCase()}.png` });
    }
  }
});

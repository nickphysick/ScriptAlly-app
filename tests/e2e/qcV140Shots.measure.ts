/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 — the report's screenshots: one beside each design-refs/query-centre-v140/screens/* state, at
 * 1512 × 900 and 1280 × 800 with the sidebar as the page leaves it. Writes reports/qc-v140/shots/. Asserts only that
 * each state was reached. Puts the guide's state back when it is done.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const OUT = "reports/qc-v140/shots";
const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const ALL = { seen: true, done: { log: true, find: true, open: true, pin: true, resp: true, birds: true } };
const G = ".qcv-group[data-v138]";
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const isPinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc140='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
const scrollBy = (page: Page, y: number) => page.evaluate((top) => { const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().width > 0)!; const sc = g.closest<HTMLElement>(".wpg-scroll")!; sc.style.scrollBehavior = "auto"; sc.scrollTop = top; return sc.scrollTop; }, y);

async function open(page: Page, vp: { width: number; height: number }, o: { pinned?: boolean; guide?: unknown } = {}) {
  flags(`--restore '${JSON.stringify(o.guide ?? ALL)}'`);
  await page.addInitScript((pinned: boolean) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); localStorage.removeItem("qh.qc.view"); localStorage.setItem("sa.guide.queries", "1");
      if (pinned) localStorage.setItem("sa.pinList.queries", "1"); else localStorage.removeItem("sa.pinList.queries");
    } catch { /* */ }
  }, !!o.pinned);
  await openRoute(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.mouse.move(5, 5);
  if (!!o.pinned !== (await isPinned(page))) { await press(page, "[data-qc140='pin']"); await page.waitForTimeout(900); }
}
async function group(page: Page, g: string, keepOpen = false) {
  await press(page, `${G} [data-qc140='group']`);
  await page.waitForTimeout(450);
  if (keepOpen) return;
  await press(page, `[data-qc140='group-opt'][data-g='${g}']`);
  await page.waitForTimeout(900);
  if (await page.locator("[data-qc140='group-menu']").count()) { await press(page, `${G} [data-qc140='group']`); await page.waitForTimeout(300); }
}
const shot = (page: Page, w: number, n: string) => page.screenshot({ path: `${OUT}/${n}-${w}.png` });

test("v140 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    /* unpinned */
    await open(page, vp);
    await shot(page, w, "01-unpinned-top");
    await scrollBy(page, 700); await page.waitForTimeout(600);
    await shot(page, w, "02-unpinned-scrolled");
    await scrollBy(page, 0); await page.waitForTimeout(400);
    await group(page, "action", true);
    expect(await page.locator("[data-qc140='group-menu']").count()).toBeGreaterThan(0);
    await shot(page, w, "03-group-menu");
    await press(page, "[data-qc140='group-opt'][data-g='action']"); await page.waitForTimeout(900);
    if (await page.locator("[data-qc140='group-menu']").count()) { await press(page, `${G} [data-qc140='group']`); await page.waitForTimeout(300); }
    await press(page, `${G} [data-qc140='jump-btn']:not([data-over])`); await page.waitForTimeout(1200);
    await shot(page, w, "04-next-action-jump");
    await scrollBy(page, 0); await page.waitForTimeout(400);
    const more = await press(page, `${G} [data-qc140='jump-more']`); await page.waitForTimeout(500);
    await shot(page, w, `05-jump-more${more ? "" : "-none"}`);
    if (more) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
    await press(page, `${G} [data-qc140='filters']`); await page.waitForTimeout(600);
    expect(await page.locator("[data-qc140='filter-menu']").count()).toBeGreaterThan(0);
    await shot(page, w, "06-filter-menu");
    await press(page, "[data-qc140='quick'][data-qp='over']"); await page.waitForTimeout(300);
    await press(page, "[data-qc140='stand'][data-k='fr']"); await page.waitForTimeout(500);
    await shot(page, w, "07-filter-menu-chosen");
    await press(page, "[data-qc140='filter-show']"); await page.waitForTimeout(900);
    expect(await page.locator("[data-qc140='applied']").count()).toBeGreaterThan(0);
    await shot(page, w, "08-filtered-grouped");
    await press(page, "[data-qc140='pin']"); await page.waitForTimeout(1200);
    await shot(page, w, "09-pinned-filtered-grouped");
    /* pinned, from a clean list */
    await open(page, vp, { pinned: true });
    await shot(page, w, "10-pinned");
    await scrollBy(page, 900); await page.waitForTimeout(600);
    await shot(page, w, "11-pinned-scrolled");
    await scrollBy(page, 0); await page.waitForTimeout(300);
    await group(page, "none");
    await shot(page, w, "12-pinned-not-grouped");
    /* the guide's Pin step */
    const g = { seen: true, done: { log: true, find: true, open: true, resp: true, birds: true } };
    await open(page, vp, { guide: g });
    if (!(await page.locator("[data-pck='popover']").count())) await page.locator("[data-pck='pill']").first().click();
    await page.waitForTimeout(500);
    await page.locator("[data-pck='item'][data-k='pin'] button").first().click();
    await page.waitForTimeout(1000);
    await shot(page, w, "13-guide-pin-step");
    await page.mouse.click(5, 400); await page.waitForTimeout(300);
  }
});

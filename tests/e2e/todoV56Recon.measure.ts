/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 — Step 0 readings (no locks): the Query Centre's and the To-do list's header, drawing, title,
 * workspace and Next button, at rest and scrolled to the end, at 1440 × 900 and 1717 × 1000. Writes
 * reports/todo-list-v56/readings/recon-<tag>.json (TD56_TAG names the build: "before" / "after").
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, startFirstTodoTask } from "./measure";

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);
const DIR = "reports/todo-list-v56/readings";
mkdirSync(DIR, { recursive: true });
const TAG = process.env.TD56_TAG ?? "before";
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }] as const;
const out: Record<string, unknown> = {};
test.afterAll(() => writeFileSync(`${DIR}/recon-${TAG}.json`, JSON.stringify(out, null, 1)));

const read = (page: Page, rootSel: string) => page.evaluate((rs) => {
  const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
  const box = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), b: +r.bottom.toFixed(1), r: +r.right.toFixed(1) }; };
  const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll");
  const hd = root.querySelector<HTMLElement>("header.qc1531-hd");
  const h1 = hd?.querySelector<HTMLElement>("h1");
  const cs = h1 ? getComputedStyle(h1) : null;
  const ws = root.querySelector<HTMLElement>('[data-tws="workspace"]');
  const next = root.querySelector<HTMLElement>('[data-tws="primary"]');
  return {
    scroller: box(sc), scrollTop: sc?.scrollTop ?? null, scrollMax: sc ? sc.scrollHeight - sc.clientHeight : null,
    header: box(hd), headerBg: hd ? getComputedStyle(hd).backgroundColor : null,
    art: box(hd?.querySelector(".qc1531-art img")), h1: box(h1), h1Font: cs ? `${cs.fontSize} ${cs.fontFamily}` : null,
    rc: box(hd?.querySelector(".qc1531-rc")),
    workspace: box(ws), wsTop: ws ? getComputedStyle(ws).top : null,
    next: box(next), nextText: next?.textContent ?? null,
    desk: box(root.querySelector('[data-tws="desk"]')),
  };
}, rootSel);

const toEnd = async (page: Page, rootSel: string) => {
  await page.evaluate((rs) => {
    const root = [...document.querySelectorAll<HTMLElement>(rs)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }, rootSel);
  await page.waitForTimeout(600);
};

for (const vp of SIZES) {
  test(`recon · Query Centre (${vp.width})`, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* */ } });
    await openRoute(page, "/queries", vp);
    await expect(page.locator(".qc151.qc153 [data-qc1531='header']").first()).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const rest = await read(page, ".qc151.qc153");
    await toEnd(page, ".qc151.qc153");
    out[`qc-${vp.width}`] = { rest, end: await read(page, ".qc151.qc153") };
  });
  test(`recon · To-do list (${vp.width})`, async ({ page }) => {
    await openRoute(page, "/todo", vp);
    /* RE-POINTED (To-do arrival v1): arrival opens no task; Start opens the one it used to */
    await startFirstTodoTask(page);
    await expect(page.locator('[data-tws="page"]:visible [data-tws-row]').first()).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3000);
    /* a request task, so the desk shows its questions and the Next button */
    const row = page.locator('[data-tws="page"]:visible [data-tws-group="wait"] [data-tws-row]').first();
    if (await row.count()) await row.click();
    await page.waitForTimeout(800);
    const rest = await read(page, ".tws-root");
    await toEnd(page, ".tws-root");
    out[`todo-${vp.width}`] = { rest, end: await read(page, ".tws-root") };
  });
}

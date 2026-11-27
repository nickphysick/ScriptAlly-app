/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the report's screens, beside design-refs/query-centre-v172/01–09 (same names, same sizes).
 * Not a lock: it writes reports/qc-v172/shots/<ref name>.png over the emulator seed.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { visiblePage } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v172/shots";

async function list(page: Page, vp: { width: number; height: number }) {
  await openQc(page, vp, { group: "attention" });
  const V = await visiblePage(page);
  /* the page remembers its last view (lib/qc150 writeView150): the list screens press List themselves */
  const sw = page.locator(`${V}[data-qc151='switch'] [data-v='list']`);
  if ((await sw.getAttribute("aria-pressed")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
  return V;
}
/** the panel's header Clear all, only while something is set (the button is not drawn otherwise) */
async function clearPanel(page: Page, W: string) {
  const b = page.locator(`${W}.qs172-h button`);
  if (await b.count()) { await b.click(); await page.waitForTimeout(500); }
}
/** scroll the page so the list card's top sits just under the pinned header */
async function toCard(page: Page, V: string) {
  await page.evaluate((V) => {
    const c = document.querySelector<HTMLElement>(`${V}[data-qc151='switch']`);
    const sc = c?.closest<HTMLElement>(".wpg-scroll");
    if (c && sc) sc.scrollTop += c.getBoundingClientRect().top - sc.getBoundingClientRect().top - 150;
  }, V);
  await page.waitForTimeout(500);
}

test("QC172 shots", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  for (const [name, vp] of [["01-list-1512", { width: 1512, height: 982 }], ["02-list-1280", { width: 1280, height: 900 }], ["03-list-1920", { width: 1920, height: 1080 }]] as const) {
    const V = await list(page, vp);
    await toCard(page, V);
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${DIR}/${name}.png` });
  }
  const V = await list(page, { width: 1512, height: 982 });
  await toCard(page, V);
  await page.locator(`${V}[data-qc151='switch'] [data-v='birds']`).click();
  await page.waitForTimeout(1500);
  await page.mouse.move(2, 2);
  /* All, with a row pointed at so its name label shows */
  await page.locator(`${V}[data-qc150='be-track']`).nth(10).hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/04-birds-all.png` });
  await page.locator(`${V}[data-qc150='zoom'] [data-z='3m']`).click();
  await page.waitForTimeout(1500);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: `${DIR}/05-birds-3m.png` });
  await page.evaluate((V) => { const sc = document.querySelector<HTMLElement>(`${V}[data-qc150='birds']`)?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop += 600; }, V);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/06-birds-3m-scrolled.png` });
  /* not a ref: 3M brought back to today, where the overdue chips sit (the seed's campaign is longer than the mock's) */
  await page.evaluate((V) => { const sc = document.querySelector<HTMLElement>(`${V}[data-qc150='birds']`)?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop -= 600; }, V);
  await page.locator(`${V}[data-qc150='today']`).click();
  await page.waitForTimeout(1200);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: `${DIR}/05b-birds-3m-today.png` });

  /* the panel set (ref 07): Stage Partial and the reply date overdue; then folded open at its foot */
  const W = await list(page, { width: 1512, height: 982 });
  await toCard(page, W);
  await page.locator(`${W}.qs172-stg button[title='Partial']`).click();
  await page.evaluate((W) => {
    const el = document.querySelector<HTMLInputElement>(`${W}.qs172 input[aria-label="Agent’s reply date to"]`);
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "0");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, W);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: `${DIR}/07-panel-set.png` });
  await clearPanel(page, W);
  await page.locator(`${W}.qs172-more`).click();
  await page.waitForTimeout(400);
  await page.evaluate((W) => { const r = document.querySelector<HTMLElement>(`${W}.qc153-railcol`); if (r) r.scrollTop = r.scrollHeight; }, W);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/08-panel-bottom.png` });

  /* nothing matches (ref 09): Needs chasing and Stage Offer */
  await clearPanel(page, W);
  await page.locator(`${W}.qs172-seg button`).nth(1).click();
  await page.locator(`${W}.qs172-stg button[title='Offer']`).click();
  await page.waitForTimeout(800);
  await page.evaluate((W) => { const r = document.querySelector<HTMLElement>(`${W}.qc153-railcol`); if (r) r.scrollTop = 0; }, W);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: `${DIR}/09-nothing-matches.png` });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.2 — the report's screens, beside design-refs/query-centre-v151-2/screens/01–11. Off unless
 * QC1512_SHOTS=1 (a routine run writes nothing). Harness data, not the mock's. Screens 04–06 fold every group, as the
 * refs do, so the header colours show; screen 10 forces every Birds-eye button visible, as its ref does.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(300_000);
const ON = process.env.QC1512_SHOTS === "1";
const OUT = "reports/qc-v151-2/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;

async function open(page: Page, vp: { width: number; height: number }, view: "list" | "birds", group: string) {
  await page.addInitScript(([v, g]: string[]) => {
    sessionStorage.removeItem("qh.qc.filters");
    sessionStorage.removeItem("qh.qc.collapsed1511");
    sessionStorage.setItem("qh.qc.view150", v);
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1");
  }, [view, group]);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
}
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const scrollTo = (page: Page, sel: string, pad: number) => page.evaluate(([s, p]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.getBoundingClientRect().height > 0);
  const sc = t?.closest<HTMLElement>(".wpg-scroll");
  if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (p as number);
}, [sel, pad] as const);
const foldAll = (page: Page) => page.evaluate(() => { for (const b of document.querySelectorAll<HTMLElement>("[data-qc1511='fold'][aria-expanded='true']")) b.click(); });

for (const vp of SIZES) {
  test(`QC1512 screens @ ${vp.width}`, async ({ page }) => {
    test.skip(!ON);
    mkdirSync(OUT, { recursive: true });
    const w = vp.width;
    await open(page, vp, "list", "attention");
    await shot(page, "01-top", w);
    await scrollTo(page, "[data-qc1511='control-line']", 0); await page.waitForTimeout(300);
    await shot(page, "02-list-who", w);
    await scrollTo(page, "[data-qc1511='group'][data-k='quiet']", 90); await page.waitForTimeout(300);
    await shot(page, "03-gone-quiet-closed", w);
    await scrollTo(page, "[data-qc1511='control-line']", 0);
    await foldAll(page); await page.waitForTimeout(300);
    await shot(page, "04-heads-who", w);
    await foldAll(page);
    for (const [name, g] of [["05-heads-next-action", "action"], ["06-heads-status", "status"]] as const) {
      await open(page, vp, "list", g);
      await scrollTo(page, "[data-qc1511='control-line']", 0);
      await foldAll(page); await page.waitForTimeout(300);
      await shot(page, name, w);
      await foldAll(page);
    }
    await open(page, vp, "list", "action");
    await page.evaluate(() => sessionStorage.removeItem("qh.qc.collapsed1511"));
    await scrollTo(page, "[data-qc1511='control-line']", 0); await page.waitForTimeout(300);
    await shot(page, "07-next-action-open", w);
    await open(page, vp, "list", "status");
    await scrollTo(page, "[data-qc1511='control-line']", 0); await page.waitForTimeout(300);
    await shot(page, "08-status-open", w);
    await open(page, vp, "list", "attention");
    await click(page, "[data-qc151='filters']"); await page.waitForTimeout(400);
    await scrollTo(page, "[data-qc1511='quick-row']", 20); await page.waitForTimeout(300);
    await shot(page, "09-filters-open", w);
    await open(page, vp, "birds", "attention");
    await scrollTo(page, "[data-qc1511='quick-row']", 20); await page.waitForTimeout(600);
    await page.addStyleTag({ content: ".qc150-be .qc150-xa { opacity: 1 !important; }" });
    await page.waitForTimeout(300);
    await shot(page, "10-birdseye-buttons-shown", w);
    await page.evaluate(() => document.querySelectorAll("style").forEach((s) => { if (s.textContent?.includes("opacity: 1 !important")) s.remove(); }));
    const br = page.locator("[data-qc150='be-row']").nth(2);
    await br.hover({ position: { x: 600, y: 20 } }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "11-birdseye-hover", w);
  });
}

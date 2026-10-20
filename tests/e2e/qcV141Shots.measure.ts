/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 — the report's screenshots, one per mock screen (design-refs/query-centre-v141/screens/01–11),
 * written to reports/qc-v141/shots/. No assertions: QC141 is the lock. The guide is put back after.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const DIR = "reports/qc-v141/shots";
const flags = (a: string) => execSync(`node tests/e2e/guideFlags.mjs --page queries ${a}`, { encoding: "utf8" }).trim().split("\n").pop()!;
let original = "null";
test.beforeAll(() => { original = flags(""); mkdirSync(DIR, { recursive: true }); });
test.afterAll(() => { flags(`--restore '${original}'`); });

const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
async function open(page: Page, w: number, h: number) {
  await page.addInitScript(() => { try { sessionStorage.removeItem("qh.qc.filters"); localStorage.removeItem("qh.qc.view"); localStorage.setItem("sa.guide.queries", "1"); localStorage.removeItem("sa.pinList.queries"); } catch { /* */ } });
  await openRoute(page, "/queries", { width: w, height: h });
  await page.locator(".qc138-sheet [data-qcv='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
}
async function group(page: Page, g: string) {
  await press(page, ".qcv-group[data-v138] [data-qc140='group']"); await page.waitForTimeout(400);
  await press(page, `[data-qc140='group-opt'][data-g='${g}']`); await page.waitForTimeout(900);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
}
/** scroll so the list's toolbar sits 120 below the scroller's top, the hero's card still in view above it */
const toToolbar = (page: Page, gap = 120) => page.evaluate((g) => {
  const t = [...document.querySelectorAll<HTMLElement>("[data-qc140='toolbar']")].find((e) => e.getBoundingClientRect().height > 0)!;
  const sc = t.closest<HTMLElement>(".wpg-scroll")!; sc.style.scrollBehavior = "auto";
  sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - g;
}, gap);
const pin = async (page: Page) => { await press(page, "[data-qc140='pin']"); await page.waitForTimeout(1000); };

test("QC141 shots", async ({ page }) => {
  test.setTimeout(600_000);
  for (const [n, w, h] of [["01-unpinned-1512", 1512, 900], ["02-unpinned-1280", 1280, 800], ["03-unpinned-1920", 1920, 1080]] as const) {
    await open(page, w, h);
    await page.screenshot({ path: `${DIR}/${n}.png` });
  }
  await open(page, 1512, 900);
  await press(page, "[data-qc141='card-row'][data-k='quiet']"); await page.waitForTimeout(900);
  await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) { s.style.scrollBehavior = "auto"; s.scrollTop = 0; } });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/04-unpinned-gone-quiet-1512.png` });
  await press(page, "[data-qc141='card-row'][data-k='quiet']"); await page.waitForTimeout(600);
  await toToolbar(page);
  await page.locator("[data-qc140='jump-btn']:visible").nth(1).hover(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/05-jump-glyph-hover-1512.png` });
  await page.mouse.move(5, 5);
  await group(page, "action");
  await toToolbar(page);
  await press(page, ".qcv-group[data-v138] [data-qc140='jump-more']:not([hidden])"); await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/07-jump-action-menu-1512.png` });
  await page.keyboard.press("Escape");
  await open(page, 1280, 800);
  await group(page, "package");
  await toToolbar(page);
  await press(page, ".qcv-group[data-v138] [data-qc140='jump-more']:not([hidden])"); await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/06-jump-package-menu-1280.png` });
  await page.keyboard.press("Escape");
  for (const [n, w, h] of [["08-pinned-1280", 1280, 800], ["09-pinned-1512", 1512, 900], ["10-pinned-1920", 1920, 1080]] as const) {
    await open(page, w, h);
    await pin(page);
    await page.screenshot({ path: `${DIR}/${n}.png` });
    if (w === 1512) {
      await press(page, "[data-qc141='band-set'][data-k='quiet']"); await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/11-pinned-gone-quiet-1512.png` });
      await press(page, "[data-qc141='band-set'][data-k='quiet']"); await page.waitForTimeout(400);
    }
    await pin(page);
  }
  /* the recon reading the report needs: the "Waiting to hear back" quick pick's count beside the card's With the agent */
  await open(page, 1512, 900);
  await press(page, ".qcv-group[data-v138] [data-qc140='filters']"); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    wait: document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='wait']")?.dataset.n,
    you: document.querySelector<HTMLElement>("[data-qc140='quick'][data-qp='you']")?.dataset.n,
    where: [...document.querySelectorAll<HTMLElement>("[data-qc141='where-opt']")].map((o) => `${o.dataset.k}:${o.dataset.n}`).join(" "),
  }));
  await page.screenshot({ path: `${DIR}/12-filters-menu-1512.png` });
  console.log("RECON", JSON.stringify(r));
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 — one shot beside each `design-refs/contact-list-v20/screens/*` file, at the same size (2×) and in the
 * same state, written to `reports/contact-list-v20/shots/`. Not a lock: the account's data is the harness's, so names
 * and counts differ from the mock's invented ones. Full screen ticks the guide, so its state is put back after.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openContacts16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";

const DIR = "reports/contact-list-v20/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
test.use({ deviceScaleFactor: 2 });
const sh = (c: string) => execSync(c, { encoding: "utf8" });

const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const scrollTo = (page: Page, y: number) => page.evaluate(async (top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".aglist .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  if (sc) { sc.style.scrollBehavior = "auto"; sc.scrollTop = top; }
  await new Promise((r) => setTimeout(r, 400));
}, y);
const fresh = async (page: Page, vp: { width: number; height: number }) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { try { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); } catch { /* */ } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp);
  await page.mouse.move(2, vp.height - 2);
};
const view = async (page: Page, v: "cards" | "list") => { await vis(page, `[data-cl20='view-pill'] [data-view='${v}'], [data-cl20='view-tb'] [data-view='${v}']`).click(); await page.waitForTimeout(800); };
const group = async (page: Page, k: string) => { await vis(page, "button.cl19-grp").click(); await page.waitForTimeout(300); await vis(page, `[data-opt="group:${k}"]`).click(); await page.waitForTimeout(800); };
const filters = async (page: Page) => { await vis(page, "button.cl19-fil").click(); await page.waitForTimeout(500); };
const yourMove = async (page: Page) => { await vis(page, "[data-cl19='quick'][data-qp='you']").click(); await page.waitForTimeout(700); };
const full = async (page: Page) => { await page.keyboard.press("f"); await page.waitForTimeout(1200); };

test("CL20 shots", async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(DIR, { recursive: true });
  const was = sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
  try {
    sh("node tests/e2e/guideFlags.mjs --seen"); sh("node tests/e2e/guideFlags.mjs --done pin");
    for (const vp of SIZES) {
      const shot = async (name: string) => { await page.mouse.move(2, vp.height - 2); await page.waitForTimeout(300); await page.screenshot({ path: `${DIR}/${name}-${vp.width}@2x.png` }); };
      await fresh(page, vp); await shot("01-list-top");
      await view(page, "cards"); await shot("02-cards-top");
      await group(page, "status"); await shot("03-cards-grouped-status");
      await scrollTo(page, 1100); await shot("04-cards-scrolled-stuck");
      await fresh(page, vp); await group(page, "status"); await scrollTo(page, 240); await shot("05-list-grouped-status");
      await scrollTo(page, 900); await shot("06-list-scrolled-stuck");
      await fresh(page, vp); await filters(page); await shot("07-filter-strip");
      await yourMove(page); await shot("08-filter-strip-chosen");
      await page.keyboard.press("Escape"); await page.waitForTimeout(400); await shot("09-filtered-count");
      await fresh(page, vp); await view(page, "cards"); await full(page); await shot("10-full-screen-cards");
      await filters(page); await shot("11-full-screen-filter-strip");
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await view(page, "list"); await shot("12-full-screen-list");
      await full(page);
      await expect(page.locator(".aglist .clv-group[data-full]")).toHaveCount(0);
    }
  } finally { sh(`node tests/e2e/guideFlags.mjs --restore '${was}'`); }
});

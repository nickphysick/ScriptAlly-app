/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 — the report's screenshots, one beside each design-refs/contact-list-v19/screens/* file, at the same
 * size (1512 × 900 or 1280 × 800 at 2×) and in the same state. Writes reports/contact-list-v19/shots/<name>.png.
 *
 * ⚠️ THE GUIDE IS PUT BACK: shot 01 is a first visit with the checklist open, so the guide is cleared for it; every
 *    other shot marks it seen with "pin" done. The guide's state is recorded first and restored exactly.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openContacts16, LOADED_ROW16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";

test.use({ deviceScaleFactor: 2 });
const OUT = "reports/contact-list-v19/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;

const shot = async (page: Page, name: string, vp: { width: number }) => {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-${vp.width}@2x.png` });
};
const fresh = async (page: Page, vp: { width: number; height: number }) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp);
  await page.evaluate(() => { const b = document.querySelector<HTMLElement>("[data-beta-strip], .beta-strip"); b?.querySelector<HTMLElement>("button[aria-label*='ismiss'], button[aria-label*='lose']")?.click(); });
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const scroll = (page: Page, y: number | "end") => page.evaluate(async (y) => {
  const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0);
  const sc = card?.closest<HTMLElement>(".wpg-scroll"); if (!sc) return;
  sc.style.scrollBehavior = "auto"; sc.scrollTop = y === "end" ? sc.scrollHeight : y;
  await new Promise((r) => setTimeout(r, 400));
}, y);
const pin = async (page: Page) => { await vis(page, "[data-cl19='pin']").click(); await page.waitForTimeout(900); };
const groupBy = async (page: Page, key: string, keepOpen = false) => {
  await vis(page, "button.cl19-grp").click(); await page.waitForTimeout(400);
  if (keepOpen) return;
  await vis(page, `[data-opt="group:${key}"]`).click(); await page.waitForTimeout(800);
};

test("CL19 shots", async ({ page }) => {
  test.setTimeout(900_000);
  const g0 = guideNow();
  try {
    for (const vp of SIZES) {
      const big = vp.width === 1512;
      /* 01 · a first visit: the checklist opens */
      sh("node tests/e2e/guideFlags.mjs --clear");
      await fresh(page, vp);
      /* after cl16Lib's own init script, which marks the old local guide flag seen */
      await page.addInitScript(() => { try { localStorage.removeItem("sa.guide.contacts"); } catch { /* */ } });
      await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2500);
      /* the first load in this tab already counted as the first visit, so the checklist is opened as it opens then */
      if (!(await page.locator("[data-pck='popover']").count())) { await vis(page, "[data-pck='pill']").click().catch(() => {}); await page.waitForTimeout(600); }
      await shot(page, "01-first-visit-unpinned", vp);
      sh(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
      sh("node tests/e2e/guideFlags.mjs --seen --done pin");
      await page.close().catch(() => {});
      page = await page.context().newPage();
      await page.setViewportSize(vp);

      /* 02 · unpinned, scrolled: the toolbar and headings stuck; 14 · the list's end, unpinned */
      await fresh(page, vp);
      await scroll(page, 700); await shot(page, "02-unpinned-scrolled", vp);
      await scroll(page, "end"); await shot(page, "14-list-end-unpinned", vp);
      /* 03 · pinned — every screen from here on is pinned, as the pack's are */
      await scroll(page, 0); await pin(page); await page.mouse.move(5, 5); await shot(page, "03-pinned", vp);

      /* 04 · an open row: one with genres and a wishlist */
      const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.agentCard!).slice(0, 10));
      for (const id of ids) {
        const row = vis(page, `.aglist [data-clv='row'][data-agent-card="${id}"]`);
        const b = await row.boundingBox(); if (!b || b.y > vp.height - 150) continue;
        await page.mouse.move(5, 5); await page.waitForTimeout(300);
        await page.mouse.move(b.x + 60, b.y + 20); await page.waitForTimeout(1100);
        const ok = await page.evaluate((id) => !![...document.querySelectorAll(`.aglist [data-agent-card="${id}"] [data-cl19='wish']`)].length && !![...document.querySelectorAll(`.aglist [data-agent-card="${id}"] .cl19-pill`)].length, id);
        if (ok) break;
      }
      await shot(page, "04-open-row", vp);
      await page.mouse.move(5, 5); await page.waitForTimeout(400);

      if (big) {
        /* 05 · an email copied */
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await vis(page, ".aglist [data-cl19='email']").click(); await page.waitForTimeout(250);
        await page.screenshot({ path: `${OUT}/05-email-copied-${vp.width}@2x.png` });
        await page.waitForTimeout(1600);
        /* 12 · sorted by Date added */
        await vis(page, ".lt-labels.lth [data-lt-col='Date added']").click(); await page.waitForTimeout(900);
        await page.mouse.move(5, 5); await shot(page, "12-sorted-date-added", vp);
        await vis(page, ".lt-labels.lth [data-lt-col='Agent']").click(); await page.waitForTimeout(700);
      }

      /* 06 · the group menu, 07 · grouped by Status, 08 · grouped and scrolled */
      await groupBy(page, "status", true); await shot(page, "06-group-menu", vp);
      await vis(page, '[data-opt="group:status"]').click(); await page.waitForTimeout(900);
      await page.mouse.move(5, 5); await shot(page, "07-grouped-status", vp);
      await scroll(page, 1100); await shot(page, "08-grouped-scrolled", vp);
      await scroll(page, 0);

      /* 09 · the filter menu, 10 · Ready to query chosen, 11 · filtered and grouped */
      await vis(page, "button.cl19-fil").click(); await page.waitForTimeout(600);
      await shot(page, "09-filter-menu", vp);
      await vis(page, "[data-cl19='quick'][data-qp='ready']").click(); await page.waitForTimeout(700);
      await shot(page, "10-filter-menu-chosen", vp);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      await page.mouse.move(5, 5); await shot(page, "11-filtered-grouped", vp);
      await vis(page, "[data-cl19='filters-clear']").click(); await page.waitForTimeout(600);
      await vis(page, "[data-cl19='group-stop']").click(); await page.waitForTimeout(800);

      /* 13 · the list's end, pinned */
      await scroll(page, "end"); await page.mouse.move(5, 5); await shot(page, "13-list-end-pinned", vp);
    }
  } finally {
    sh(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
  }
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.1 — the report's screenshots, one beside each design-refs/contact-list-v19-1/screens/* file, at the
 * same size (1512 × 900 or 1280 × 800 at 2×) and in the same state. Writes reports/contact-list-v19-1/shots/<name>.png.
 *
 * ⚠️ THE GUIDE IS PUT BACK: every shot marks it seen with "pin" done (pinning would otherwise pop its done-note over the
 *    band); its state is recorded first and restored exactly.
 * ⚠️ THE HARNESS HAS NO WEBSITES, so the websites the mock shows are absent here (and a row's "+ Add website" shows
 *    only on the hovered row, as the mock's does).
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openContacts16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";

test.use({ deviceScaleFactor: 2 });
const OUT = "reports/contact-list-v19-1/shots";
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
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const scroll = (page: Page, y: number | "end") => page.evaluate(async (y) => {
  const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0);
  const sc = card?.closest<HTMLElement>(".wpg-scroll"); if (!sc) return;
  sc.style.scrollBehavior = "auto"; sc.scrollTop = y === "end" ? sc.scrollHeight : y;
  await new Promise((r) => setTimeout(r, 400));
}, y);
/** hover the n-th row wholly on screen below the sticky head, by its name, long enough to open it */
const hoverRow = async (page: Page, vp: { height: number }, nth: number) => {
  const id = await page.evaluate(({ h, nth }) => {
    const head = [...document.querySelectorAll<HTMLElement>(".lt-labels.lth")].find((e) => e.getBoundingClientRect().height > 0);
    const top = (head?.getBoundingClientRect().bottom ?? 0) + 8;
    const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.top >= top && b.bottom <= h - 160; });
    return rows[Math.min(nth, rows.length - 1)]?.dataset.agentCard ?? null;
  }, { h: vp.height, nth });
  if (!id) return;
  await page.mouse.move(5, 5); await page.waitForTimeout(300);
  const b = await vis(page, `.aglist [data-clv='row'][data-agent-card="${id}"] .clv-rwn b`).boundingBox();
  if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(1100); }
};

test("CL191 shots", async ({ page }) => {
  test.setTimeout(900_000);
  const g0 = guideNow();
  try {
    sh("node tests/e2e/guideFlags.mjs --seen --done pin");
    for (const vp of SIZES) {
      await fresh(page, vp);
      await page.mouse.move(5, 5);
      await shot(page, "01-unpinned", vp);
      /* 02 · the second row hovered: it opens, and its "+ Add" links show */
      await hoverRow(page, vp, 1);
      await shot(page, "02-unpinned-open-row-hover", vp);
      await page.mouse.move(5, 5); await page.waitForTimeout(400);
      /* 03 · scrolled: the navy toolbar and the headings stuck */
      await scroll(page, 700); await shot(page, "03-unpinned-scrolled", vp);
      /* 04 · the list's end: the rounded foot with 22px of page below */
      await scroll(page, "end"); await shot(page, "04-unpinned-end", vp);
      await scroll(page, 0);
      /* 05 · pinned */
      await vis(page, "[data-cl19='pin']").click(); await page.waitForTimeout(900);
      await page.mouse.move(5, 5); await shot(page, "05-pinned", vp);
      /* 06 · pinned, grouped by Status, scrolled a little, a row in the second group open */
      await vis(page, "button.cl19-grp").click(); await page.waitForTimeout(400);
      await vis(page, '[data-opt="group:status"]').click(); await page.waitForTimeout(900);
      await scroll(page, 120);
      await hoverRow(page, vp, 1);
      await shot(page, "06-pinned-grouped-open-row", vp);
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      await vis(page, "[data-cl19='group-stop']").click(); await page.waitForTimeout(700);
      await vis(page, "[data-cl19='pin']").click(); await page.waitForTimeout(900);
    }
  } finally {
    sh(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
  }
});

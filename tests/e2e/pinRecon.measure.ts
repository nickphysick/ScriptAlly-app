/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pinned-row fix §0 — RECON. On every page with a pinned row, scrolled 1500px with the shell: the row's box, every
 * element painted above it within its top 24px (by `elementsFromPoint`, sampled across the row), the visible top
 * (the lowest bottom edge of those), and each child's vertical centre against the box's centre and the visible
 * centre. Writes reports/pin-row/recon.json; asserts only that it found the rows.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { PIN_PAGES, scrollPage, readPin, paintCovers } from "./pinLib";

test("pin recon", async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  const out: Record<string, unknown> = {};
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    for (const p of PIN_PAGES) {
      await openRoute(page, p.route, vp);
      await page.locator(`${p.group}`).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1200);
      await scrollPage(page, p.group, 1500);
      const r = await readPin(page, p.row, p.inner);
      const painted = await paintCovers(page, p.row);
      const cover = Math.max(0, ...painted.map((c) => c.coverPx));
      /* the children against the VISIBLE area: from the lowest covering edge to the row's bottom */
      const kidsVis = r ? r.kids.map((k) => ({ ...k, vsPaintedVisible: Math.round((k.vsBox - cover / 2) * 10) / 10 })) : null;
      out[`${p.key}@${vp.width}`] = { ...r, painted, paintedCover: cover, kids: kidsVis };
      console.log("RECON", p.key, vp.width, JSON.stringify(r));
    }
  }
  mkdirSync("reports/pin-row", { recursive: true });
  writeFileSync("reports/pin-row/recon.json", JSON.stringify(out, null, 1));
  expect(Object.values(out).every(Boolean)).toBe(true);
});

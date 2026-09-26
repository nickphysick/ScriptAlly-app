/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * illustratedMasthead — REWRITTEN for page header v1 (§3.1). The full header's drawing: it stands
 * on the rule, it stays out of the words, and a page without one reserves nothing.
 *
 * ⚠️ WHAT THIS REPLACES. It measured the MARK — a 52px glyph in the shared masthead, one size for
 * both the monoline and illustrated families, on ten pages. There are no marks: the compact header
 * draws none at all, and the full header carries a commissioned drawing anchored to its own
 * bottom-right corner. The old claims have no subject, so they are not retargeted; what survives is
 * the question they were asking — does the page's picture sit where the design puts it.
 *
 * ⚠️ AND THE DRAWN IMAGE IS NOT THE BOX. With `object-fit: contain` the element keeps the box's
 * size and paints a smaller picture inside it, so `getBoundingClientRect` says nothing about where
 * the drawing ends. Computing the drawn edge from `object-position` is the whole reason this file
 * can make its claim at all — asserting the element's rect would pass with the art anchored to the
 * top, which is the one arrangement the design forbids.
 */
import { expect, test, type Page } from "@playwright/test";
import { openRoute } from "./measure";

/** §3.3 — the pages that open with the full header. The Contact list is not converted yet. */
const WITH_ART = ["/queries"];
const WITHOUT_ART = ["/todo", "/queries/analytics", "/manuscripts/comps"];

async function open(page: Page, path: string, w: number) {
  await openRoute(page, path, { width: w, height: 900 });
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
}

const art = (page: Page) => page.evaluate(() => {
  const h = [...document.querySelectorAll("[data-probe='page-header']")]
    .find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
  if (!h) return null;
  const img = h.querySelector("[data-probe='art'] img") as HTMLImageElement | null;
  const hb = h.getBoundingClientRect();
  const text = h.querySelector(".ph-text") as HTMLElement | null;
  if (!img) return { has: false, headerBottom: Math.round(hb.bottom) };
  const box = img.getBoundingClientRect();
  const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const posY = getComputedStyle(img).objectPosition.split(/\s+/)[1] ?? "50%";
  const fracY = posY.endsWith("%") ? parseFloat(posY) / 100 : posY === "bottom" ? 1 : posY === "top" ? 0 : 0.5;
  return {
    has: true,
    drawnBottom: Math.round(box.top + (box.height - dh) * fracY + dh),
    drawnLeft: Math.round(box.right - dw),
    headerBottom: Math.round(hb.bottom),
    headerTop: Math.round(hb.top),
    textRight: text ? Math.round(text.getBoundingClientRect().right) : null,
    boxW: Math.round(box.width), headerW: Math.round(hb.width),
    natural: `${img.naturalWidth}×${img.naturalHeight}`,
  };
});

test("§3.1 · the drawing stands on the rule and stays out of the words", async ({ page }) => {
  for (const route of WITH_ART) {
    for (const w of [1280, 1440]) {
      await open(page, route, w);
      const a = await art(page);
      expect(a, `${route} at ${w}: no header`).toBeTruthy();
      expect(a!.has, `${route} at ${w}: the full header drew no art`).toBe(true);
      /* ⚠️ THE CLAIM — the drawn image's bottom IS the rule, within a pixel. */
      expect(Math.abs(a!.drawnBottom! - (a!.headerBottom - 1)), `${route} at ${w}: the drawing left the rule (${a!.drawnBottom} vs ${a!.headerBottom - 1})`)
        .toBeLessThanOrEqual(1.5);
      /* …the box is 42% of the header */
      expect(Math.abs(a!.boxW! - a!.headerW! * 0.42), `${route} at ${w}: the art box is ${a!.boxW} of ${a!.headerW}`).toBeLessThanOrEqual(2);
      /* …and the DRAWING clears the text block. The box may overlap; the picture may not. */
      expect(a!.drawnLeft!, `${route} at ${w}: the drawing runs under the words`).toBeGreaterThanOrEqual((a!.textRight ?? 0) - 1);
    }
  }
});

test("§3.1 · a page with no drawing reserves nothing for one", async ({ page }) => {
  for (const route of WITHOUT_ART) {
    await open(page, route, 1440);
    const a = await art(page);
    expect(a, `${route}: no header`).toBeTruthy();
    expect(a!.has, `${route}: an empty art well was reserved`).toBe(false);
  }
});

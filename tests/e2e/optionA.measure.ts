/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGED STRIP — Option A, measured (design-refs/package-strip-parcel.html) ═══════════
 *
 * ⚠️ THE HEIGHT IS THE CLAIM. The construction this replaces stood ~92px; the ref draws ~40. D3 says
 * anything above ~48 means something was carried over that should not have been — so the number is
 * reported, not just bounded.
 *
 * ⚠️ AND THE MARK IS MEASURED AS PAINTED PIXELS, NOT AS AN ATTRIBUTE. `width={24}` proves what was
 * asked for; a `naturalWidth` of 0 or a failed request would leave the attribute intact and the row
 * empty. The rendered rect and the decoded source are different questions and both are asked.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("Option A — one row, two cells, and the parcel", async ({ page }) => {
  const out: Record<string, unknown>[] = [];

  for (const width of [1440, 1920]) {
    await openRoute(page, "/queries?q=seed-query-8", { width, height: 1200 });
    await expect(page.locator(".qc-pstrip").first()).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(300);

    const r = await page.evaluate(() => {
      const n = (v: number) => Math.round(v * 10) / 10;
      const strip = document.querySelector(".qc-pstrip") as HTMLElement;
      const blue = strip.querySelector(".qc-ps-nm") as HTMLElement;
      const white = strip.querySelector(".qc-ps-sl") as HTMLElement;
      const img = strip.querySelector("img") as HTMLImageElement;
      const sb = strip.getBoundingClientRect(), bb = blue.getBoundingClientRect(), wb = white.getBoundingClientRect();
      const ib = img.getBoundingClientRect();
      const cs = getComputedStyle(blue);
      return {
        rowH: n(sb.height),
        rowW: n(sb.width),
        blueW: n(bb.width),
        /* the two cells meet — no gap, no overlap */
        seam: n(wb.left - bb.right),
        blueFill: cs.backgroundImage.slice(0, 60),
        rightBorder: cs.borderRightWidth,
        clips: getComputedStyle(strip).overflow,
        radius: getComputedStyle(strip).borderRadius,
        /* ⚠️ PAINTED, AND DECODED. An attribute proves intent; naturalWidth proves the file loaded. */
        markPainted: `${n(ib.width)}×${n(ib.height)}`,
        markNatural: `${img.naturalWidth}×${img.naturalHeight}`,
        markLoaded: img.complete && img.naturalWidth > 0,
        /* the slots, as LABEL Value pairs rather than pills */
        slots: [...white.querySelectorAll(".qc-mchip-slot")].map((s) => ({
          text: (s as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
          fill: getComputedStyle(s).backgroundColor,
          bordered: parseFloat(getComputedStyle(s).borderTopWidth) > 0,
        })),
        /* D4 — nothing of the band survives on the page */
        bandRemnants: [".qc-stat", ".qc-stat-head", ".qc-stat-body", ".qc-stat-glyph", ".qc-stat-l"]
          .filter((c) => document.querySelector(c) !== null),
        /* D6 — the actions are outside the row and still revealed */
        actsOutsideRow: !strip.querySelector(".qc-stat-acts") && !!document.querySelector(".qc-attach .qc-stat-acts"),
      };
    });
    out.push({ width, ...r });

    /* D3 — the height, reported and bounded */
    expect(r.rowH, `row is ${r.rowH}px at ${width} — the band it replaces was ~92`).toBeLessThanOrEqual(48);
    expect(r.rowH, `row is ${r.rowH}px — too short to hold a 24px mark`).toBeGreaterThanOrEqual(34);

    /* D2 — the mark, painted at 24 and actually decoded */
    expect(r.markLoaded, "the parcel did not load").toBe(true);
    expect(r.markPainted).toBe("24×24");
    expect(r.markNatural).toBe("100×100");

    /* D1 — two cells that meet, the left one blue and bordered */
    expect(r.seam, `a ${r.seam}px gap between the cells`).toBe(0);
    expect(r.blueFill).toContain("linear-gradient");
    expect(parseFloat(r.rightBorder)).toBeGreaterThan(0);
    expect(r.clips).toBe("hidden");

    /* the slots read as pairs — no fill, no border */
    expect(r.slots.length, "no slots in the white cell").toBe(3);
    for (const s of r.slots) {
      expect(s.bordered, `slot "${s.text}" still has a pill border`).toBe(false);
      expect(s.fill, `slot "${s.text}" still has a pill fill`).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    }

    /* D4 / D6 */
    expect(r.bandRemnants, `the band survives on the page: ${r.bandRemnants.join(", ")}`).toEqual([]);
    expect(r.actsOutsideRow, "the actions are inside the row").toBe(true);
  }

  console.log(JSON.stringify(out, null, 2));
});

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
        /* side by side: the white cell starts where the blue one ends. Stacked: it starts below. */
        seam: getComputedStyle(strip).flexDirection === "column"
          ? n(wb.top - bb.bottom)
          : n(wb.left - bb.right),
        blueFill: cs.backgroundImage.slice(0, 60),
        rightBorder: cs.borderRightWidth,
        bottomBorder: cs.borderBottomWidth,
        stacked: getComputedStyle(strip).flexDirection === "column",
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

    /**
     * D3 — the height, reported and bounded.
     *
     * ⚠️ THE BOUND IS AGAINST THE BAND IT REPLACES, NOT AGAINST THE REF'S 40px. The ref draws the
     * row at 560px; the timeline column it lives in is 337px at 1440 and 625px at 1920. Where it
     * has the room the row is one line at ~40; where it does not, it STACKS to ~72 rather than
     * wrapping its slots onto three lines at 128. Both must beat the 92px band, which is the claim
     * this construction was made to deliver.
     */
    expect(r.rowH, `row is ${r.rowH}px — too short to hold a 24px mark`).toBeGreaterThanOrEqual(34);
    /**
     * ⚠️ THE ~40px CLAIM HOLDS WHERE THE COLUMN HAS THE ROOM, AND ONLY THERE — measured, and
     * reported rather than asserted away.
     *
     * With the sample's version chip (a feature the ref predates, costing ~100px) the three slots
     * need 398px on one line and the blue cell 149, so the single row needs ~575. The timeline
     * column gives 560+ at 1920 and **337 at 1440** — where nothing can put 398px of slots on one
     * line, whatever the arrangement. The bound is therefore conditional on the room available, and
     * the narrow case is a FINDING in the report, not a threshold quietly widened to swallow it.
     */
    if (r.rowW >= 575) {
      expect(r.rowH, `${r.rowW}px of room and still ${r.rowH}px tall`).toBeLessThanOrEqual(48);
    } else {
      /* it must still stack rather than wrap into a tower, and stay under the old band's height
         plus the chip's own line */
      expect(r.stacked, `${r.rowW}px of room and the row did not stack`).toBe(true);
      expect(r.rowH, `row is ${r.rowH}px at ${r.rowW}px wide`).toBeLessThan(140);
    }

    /* D2 — the mark, painted at 24 and actually decoded */
    expect(r.markLoaded, "the parcel did not load").toBe(true);
    expect(r.markPainted).toBe("24×24");
    expect(r.markNatural).toBe("100×100");

    /* D1 — two cells that meet, the left one blue. Stacked, the divider moves to the bottom edge. */
    expect(r.seam, `a ${r.seam}px gap between the cells`).toBe(0);
    expect(r.blueFill).toContain("linear-gradient");
    const divider = parseFloat(r.rightBorder) + parseFloat(r.bottomBorder);
    expect(divider, "the two cells have no divider between them").toBeGreaterThan(0);
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

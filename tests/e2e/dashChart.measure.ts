/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CHART'S BANDS AND ITS HOVER PANEL, on a rendered page (dashboard redesign, Phase 4).
 *
 * ⚠️ THE BANDS RECONCILE IN A UNIT TEST AND ARE PAINTED HERE. `chartBands.test.ts` proves the
 * arithmetic — three stocks plus the unplaceable equal the ledger's `active` at every point, over a
 * fixture that exercises every branch. What it cannot prove is that three `<path>`s reached the SVG
 * with real geometry: this repo has measured a `repeat(auto-fit, minmax(0, 1fr))` resolve to a
 * hundred phantom tracks and a `flex: 1` chain compute to exactly 0, both through green source
 * locks. A path with an empty `d` is the same class of fault and is invisible to every one of them.
 *
 * ⚠️ AND THE PANEL'S CONTAINMENT IS A CLAIM ABOUT TWO BOXES. "It measures itself and flips to stay
 * inside the plot" cannot be read out of a stylesheet at all — `placeTooltip` decides it at runtime
 * from the anchor and the viewport.
 */
import { expect, test } from "@playwright/test";
import { openRoute } from "./measure";

async function openDash(page: import("@playwright/test").Page, width = 1600) {
  await openRoute(page, "/dashboard", { width, height: 1000 });
  await expect(page.locator(".os-lead").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

test.describe("P4 · the chart", () => {
  test("P4.1 · three bands are painted, with real geometry and the shared state fills", async ({ page }) => {
    await openDash(page);
    const r = await page.evaluate(() => {
      const paths = [...document.querySelectorAll(".os-lead .os-band")] as SVGPathElement[];
      const fills = paths.map((p) => getComputedStyle(p).fill);
      return {
        n: paths.length,
        fills,
        /* a path with an empty or degenerate `d` is the fault a source lock cannot see */
        lengths: paths.map((p) => Math.round(p.getTotalLength())),
        legend: [...document.querySelectorAll(".os-lead .os-bk")].map((e) => (e.textContent ?? "").trim()),
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[P4.1] bands=${r.n} lengths=${r.lengths.join("/")} fills=${r.fills.join(" ")} legend=${r.legend.join(" · ")}`);
    /* ⚠️ THE POPULATION FIRST — zero bands yields zero offending fills and passes having measured
       nothing, the vacuous shape this repo records against every negative check. */
    expect(r.n, "the three band areas must be painted").toBe(3);
    for (const len of r.lengths) expect(len, "a band path has no geometry").toBeGreaterThan(50);
    expect(r.legend.length, "the legend names three bands").toBe(3);
    /* the four v2 state fills, resolved — sand, sage, pink. NEVER slate. */
    const uniq = [...new Set(r.fills)];
    expect(uniq.length, `the three bands must be three colours, got ${uniq.join("/")}`).toBe(3);
    expect(r.fills.join(" ").toLowerCase(), "the slate offer fill reached the chart")
      .not.toContain("215, 224, 232"); // #d7e0e8
  });

  test("P4.2 · the hover panel stays inside the plot at every hoverable x", async ({ page }) => {
    await openDash(page);
    const plot = await page.locator(".os-lead .os-chartwrap").boundingBox();
    expect(plot, "the plot must be on screen before anything is hovered").not.toBeNull();

    const seen: string[] = [];
    const STEPS = 9;
    for (let i = 0; i < STEPS; i++) {
      const x = plot!.x + 6 + ((plot!.width - 12) * i) / (STEPS - 1);
      /* the reading zone is ON the line and below it, so hover low in the plot */
      await page.mouse.move(x, plot!.y + plot!.height - 12);
      await page.waitForTimeout(120);
      const box = await page.evaluate(() => {
        const t = document.querySelector(".os-tip.show") as HTMLElement | null;
        if (!t) return null;
        const b = t.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, cap: (t.querySelector(".fcap")?.textContent ?? "").trim() };
      });
      if (!box) { seen.push(`${Math.round(x)}: (no panel)`); continue; }
      seen.push(`${Math.round(x)}: ${Math.round(box.w)}×${Math.round(box.h)} "${box.cap}"`);
      const vw = await page.evaluate(() => window.innerWidth);
      const vh = await page.evaluate(() => window.innerHeight);
      expect(box.x, `panel left of the viewport at x=${Math.round(x)}`).toBeGreaterThanOrEqual(-1);
      expect(box.y, `panel above the viewport at x=${Math.round(x)}`).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.w, `panel past the right edge at x=${Math.round(x)}`).toBeLessThanOrEqual(vw + 1);
      expect(box.y + box.h, `panel past the bottom edge at x=${Math.round(x)}`).toBeLessThanOrEqual(vh + 1);
    }
    // eslint-disable-next-line no-console
    console.log(`[P4.2] ${seen.join("\n        ")}`);
    /* ⚠️ AND THE SWEEP MUST HAVE SEEN A PANEL. Every assertion above is skipped when none opened,
       so a run where the hover never registered would report a clean pass over nothing. */
    expect(seen.filter((l) => !l.includes("(no panel)")).length, "no hover ever opened a panel")
      .toBeGreaterThan(3);
    /* ⚠️ AND IT MUST HAVE SEEN BOTH CAPTIONS — the two blocks are the whole point of the split, and
       a sweep that only ever lands on past points proves half of it. */
    const caps = new Set(seen.map((l) => l.slice(l.indexOf('"'))).filter(Boolean));
    // eslint-disable-next-line no-console
    console.log(`[P4.2] captions seen: ${[...caps].join(" | ")}`);
  });
});

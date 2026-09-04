/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre §7 — THE FINISHING MEASUREMENT.
 *
 * ⚠️ FOUR WIDTHS, BECAUSE A LAW THAT HOLDS AT ONE IS A COINCIDENCE. The cap and the centring are
 * only interesting either side of the point where the cap BINDS: below it the column fills and the
 * margins are zero by construction, above it the surplus must pool symmetrically. A run at 1440
 * alone would prove the first and say nothing about the second.
 *
 * ⚠️ AND THE SCROLLED SHOT IS THE ONE THAT CANNOT BE READ OFF A STYLESHEET. `position: sticky`
 * computes as `sticky` whether or not it ever moves — on a row with nothing to scroll it CLAMPS —
 * so the claim "the controls hold while the cards pass under them" is only answerable by scrolling.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

const SHOTS = "reports/query-centre-shots";
const WIDTHS = [1280, 1440, 1920, 2560];

test("the grid caps, centres and sticks — at every width", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const out: Record<string, unknown> = {};

  for (const width of WIDTHS) {
    await openRoute(page, "/queries", { width, height: 900 });
    await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

    const geo = await page.evaluate(() => {
      const vis = (sel: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(sel))
          .find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const col = vis(".qcc-col");
      const scroller = vis(".wpg-scroll");
      const grid = vis(".qcc-grid");
      if (!col || !scroller || !grid) return null;
      const c = col.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      return {
        colWidth: Math.round(c.width),
        capPx: parseFloat(getComputedStyle(col).maxWidth),
        left: Math.round(c.left - s.left),
        right: Math.round(s.right - c.right),
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        /* the whole page must never scroll sideways */
        docOverflow: Math.round(document.documentElement.scrollWidth - window.innerWidth),
      };
    });
    expect(geo, `no visible grid at ${width}`).not.toBeNull();
    out[`w${width}`] = geo;

    /* ⚠️ THE CAP IS ASSERTED AS A RELATION, NOT A NUMBER. Pinning 1360 would go red on a
       legitimate retune; "never wider than its own declared cap" survives one and still fails a
       column that has escaped it. */
    expect(geo!.colWidth, `column exceeds its cap at ${width}`).toBeLessThanOrEqual(geo!.capPx + 1);
    /* true centring: the surplus pools equally, within a rounding pixel */
    expect(Math.abs(geo!.left - geo!.right), `off-centre at ${width}`).toBeLessThanOrEqual(2);
    expect(geo!.docOverflow, `the page scrolls sideways at ${width}`).toBeLessThanOrEqual(0);

    await page.screenshot({ path: `${SHOTS}/finish-${width}.png` });
  }

  /* ── the scrolled state, at the width the design was judged at ─────────────────────────── */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

  const read = () => page.evaluate(() => {
    const vis = (sel: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(sel))
        .find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const c = vis(".qcc-controls"), s = vis(".wpg-scroll");
    if (!c || !s) return null;
    /* ⚠️ THE TOKEN IS PUBLISHED ON THE GRID, NOT ON :root. Read from documentElement it comes
       back 0 — a plausible number about the wrong element, which is the reading that would have
       been quoted in the report as "the bar contributes nothing". */
    const wpg = vis(".wpg");
    const stuck = parseFloat(getComputedStyle(wpg ?? document.documentElement)
      .getPropertyValue("--wpg-stuck-h")) || 0;
    return {
      controlsTop: Math.round(c.getBoundingClientRect().top),
      scrollerTop: Math.round(s.getBoundingClientRect().top),
      scrollTop: Math.round(s.scrollTop),
      maxScroll: Math.round(s.scrollHeight - s.clientHeight),
      stuckH: Math.round(stuck),
      /* where the controls actually came to rest, measured from the scrollport's own top */
      heldBelowPort: Math.round(c.getBoundingClientRect().top - s.getBoundingClientRect().top),
    };
  });

  const rest = await read();
  expect(rest, "no visible controls at rest").not.toBeNull();

  /* ⚠️ THE PRECONDITION IS ASSERTED, NOT ASSUMED. On a row with nothing to scroll every claim
     below is trivially true, and the check would go green having measured a page that never
     moved. It is REPORTED rather than required — whether this account's fixture overflows today
     is a fact about the data, not about the page. */
  out.scrollable = (rest!.maxScroll > 200);
  if (rest!.maxScroll > 200) {
    await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll<HTMLElement>(".wpg-scroll"))
        .find((e) => e.getBoundingClientRect().height > 0);
      if (s) s.scrollTop = 400;
    });
    await page.waitForTimeout(400);
    const scrolled = await read();
    out.rest = rest; out.scrolled = scrolled;

    /* the controls have not gone with the cards */
    expect(scrolled!.controlsTop, "the controls scrolled away with the cards")
      .toBeGreaterThanOrEqual(scrolled!.scrollerTop - 1);
    /* and they are held under the compact bar, not over it */
    expect(scrolled!.controlsTop, "the controls rode up over the collapsed bar")
      .toBeGreaterThanOrEqual(rest!.scrollerTop - 1);
    /* ⚠️ THE TWO NUMBERS ARE ASSERTED AGAINST EACH OTHER, not against a literal. Where the
       controls come to rest IS the height the grid publishes for its collapsed bar — a hard-coded
       44 would go red the day the bar is retyped, and would pass on a page where the controls
       stuck to the wrong thing and the arithmetic happened to agree. */
    expect(scrolled!.heldBelowPort, "the controls did not come to rest on the collapsed bar")
      .toBe(scrolled!.stuckH);
    await page.screenshot({ path: `${SHOTS}/finish-1440-scrolled.png` });
  } else {
    out.rest = rest;
    await page.screenshot({ path: `${SHOTS}/finish-1440-scrolled.png` });
  }

  writeFileSync("reports/query-centre-finish.json", JSON.stringify(out, null, 2));
});

/**
 * v55 — RETIRED: the pill-and-headline anatomy died with the v63 bar (the band carries the
 * status and holder; the body carries name · agency · fact). Successors: calBar63 d9 (every
 * size the ref's, in px), d11 (line two's two spans), calFid63 (4) (the body's inset and line
 * count). The both-ends-cut opacity claim survives in calBar63 d13's painted-set sweep, which
 * forbids any gradient or mask over a card at all.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the pill-and-headline anatomy is gone, and the band stands in its place", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    return {
      pills: g.querySelectorAll(".tl-cpill, .tl-chead").length,
      bands: g.querySelectorAll(".tl-sband").length,
      opac: [...g.querySelectorAll<HTMLElement>(".tl-cardbody")]
        .filter((e) => e.getBoundingClientRect().height > 1)
        .map((e) => getComputedStyle(e).opacity),
    };
  });
  expect(r.pills, "the pill/headline anatomy is back").toBe(0);
  expect(r.bands, "no bands").toBeGreaterThan(5);
  expect(r.opac.length, "no bodies").toBeGreaterThan(5);
  for (const o of r.opac) expect(o, "a body paints at partial opacity").toBe("1");
});

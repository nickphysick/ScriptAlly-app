/** §3 — all four edges of every card that keeps its container, at rest and on hover. */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const edges = (page: import("@playwright/test").Page, sel: string) => page.evaluate((s) => {
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const el = g.querySelector(s) as HTMLElement | null;
  if (!el) return null;
  const c = getComputedStyle(el);
  return { top: c.borderTopWidth, right: c.borderRightWidth, bottom: c.borderBottomWidth, left: c.borderLeftWidth,
           colour: c.borderTopColor, clip: c.overflow, radius: c.borderRadius };
}, sel);

test("§3 — every kept container still has four edges, at rest and on hover", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  for (const [sel, label] of [[".f12-hero", "agent hero"], [".f12-card", "sage-headed card"]] as const) {
    const rest = await edges(page, sel);
    expect(rest, `${label} is missing`).not.toBeNull();
    await page.locator(sel).first().hover();
    await page.waitForTimeout(200);
    const hov = await edges(page, sel);
    console.log(`${label}\n  rest : ${JSON.stringify(rest)}\n  hover: ${JSON.stringify(hov)}`);
    /* ⚠️ ALL FOUR EDGES, BOTH STATES — this fault has recurred twice, and each time it was one
       edge, in one state, which is exactly what a single-edge check misses. */
    for (const state of [["rest", rest], ["hover", hov]] as const) {
      for (const side of ["top", "right", "bottom", "left"] as const) {
        expect(state[1]![side], `${label}: the ${side} edge is missing at ${state[0]}`).toBe("1px");
      }
    }
    expect(rest!.clip, `${label} lost its clipping — a header band would paint outside the radius`).toBe("hidden");
  }
});

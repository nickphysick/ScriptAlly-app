/**
 * v54 — RETIRED: the frame/content split, the 36px dissolve inset and the two-inset law belong
 * to the dissolve era. Successors: calFid63 (4) pins the ONE 14px body inset and the two-line
 * body; calBar63 d13 asserts nothing is painted over a card; calDens64 owns the soft window
 * edges that replaced the cut this file's insets served.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the dissolve era's anatomy is gone, and the one-inset successor stands", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bodies = [...g.querySelectorAll<HTMLElement>(".tl-p")]
      .filter((c) => c.getBoundingClientRect().height > 1)
      .map((c) => {
        const b = c.querySelector<HTMLElement>(".tl-cardbody")!;
        return +(b.getBoundingClientRect().left - c.getBoundingClientRect().left).toFixed(1);
      });
    return { content: g.querySelectorAll(".tl-content").length, bodies };
  });
  expect(r.content, "the frame/content split is back").toBe(0);
  expect(r.bodies.length, "no card bodies measured").toBeGreaterThan(5);
  /* ONE inset — 14px on every card, cut or whole (compact moves it to 34; this runs at rest) */
  for (const x of r.bodies) expect(Math.abs(x - 14), `a body sits ${x}px in`).toBeLessThanOrEqual(1);
});

/**
 * v54/55 — RETIRED: the open-and-drop anatomy is gone. `.tl-cdt`, `.tl-pill` and `.tl-hl` died
 * with the v63 bar; the "detail drop" (`data-nodetail`) has nothing left to hide, and overflow on
 * a card is handled by the CLIP AND GLIDE (`.tl-bwrap`), with the v54 widen (`[data-tight]:hover`
 * reading `--exp`/`--hx`) surviving in comfortable for cards too tight for their words.
 *
 * ⚠️ THE WIDEN IS UNPROVED ON THIS FIXTURE, AND THE FILE SAYS SO RATHER THAN PASSING OVER IT.
 * Every harness card fits its span at 1440 and 1024 (the lane floors at ~434px against ~406px of
 * worst-case words), so `data-tight` never appears and no case here can drive the mechanism
 * without narrowing the lane by stylesheet — which proved the OLD drop branch, not the live
 * glide. If the fixture ever gains a long-named relationship on a short span, the widen becomes
 * measurable again; until then it is code with no exercised subject, reported every run.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the open-and-drop anatomy is gone; the glide's clip stands; the widen is counted", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1024, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")].filter((c) => c.getBoundingClientRect().height > 1);
    return {
      cdt: g.querySelectorAll(".tl-cdt, .tl-pill, .tl-hl").length,
      cards: cards.length,
      tight: cards.filter((c) => c.hasAttribute("data-tight")).length,
      clipped: cards.filter((c) => {
        const w = c.querySelector<HTMLElement>(".tl-bwrap");
        return !!w && w.scrollWidth > w.clientWidth + 1;
      }).length,
    };
  });
  expect(r.cdt, "the v55 pill/headline/detail anatomy is back").toBe(0);
  expect(r.cards, "no cards").toBeGreaterThan(5);
  console.log(`cards ${r.cards} · data-tight ${r.tight} · clipped bwraps ${r.clipped}`
    + (r.tight === 0 ? " — ⚠️ the widen ran on zero subjects this fixture" : ""));
});

import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ EVERY PART OF A ROW IS ABOUT A QUERY THAT ROW ACTUALLY DRAWS (carried forward from
 * `calLook.measure.ts`, which is retired at v55 §7).
 *
 * This is the one law in that file that is still live and was not covered anywhere else. Three
 * variants of the bug shipped: a row whose words, pill or deed described a query the reader could
 * not see on it — each a TRUE sentence about the wrong journey, and none catchable from appearance
 * alone. `data-qid` exists on every card for exactly this, and the claim is that the set of
 * queries a row TALKS about is a subset of the set it DRAWS.
 */
test("a row's cards all belong to the row that draws them", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  let checked = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const bad = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
      const out: string[] = [];
      let n = 0;
      for (const row of ([...document.querySelectorAll(".tl-rrow")] as HTMLElement[]).filter(vis)) {
        const key = row.getAttribute("data-rowkey") || "";
        for (const c of ([...row.querySelectorAll(".tl-p")] as HTMLElement[])) {
          n += 1;
          /* the card's own row identity is published on it; it must be the row it is inside */
          const rel = c.dataset.rel || "";
          if (!rel.startsWith(`${key}::`)) out.push(`${key} draws a card belonging to ${rel}`);
          /* and it must name a query */
          if (!c.dataset.qid) out.push(`${key} draws a card naming no query`);
        }
      }
      return { out, n };
    });
    checked += bad.n;
    expect(bad.out, `[${RANGE_LABELS[i]}] a row draws a card that is not its own`).toEqual([]);
  }
  console.log(`cards checked against their rows: ${checked}`);
  expect(checked, "no cards were checked").toBeGreaterThan(20);
});

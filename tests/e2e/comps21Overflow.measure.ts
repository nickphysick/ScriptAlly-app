/**
 * Comparable titles v2.1 — the stacked row must not push the page sideways.
 *
 * ⚠️ IT ASSERTS THE PAGE'S OWN SCROLLER, NOT THE DOCUMENT. A `fullPage` screenshot at 900px LOOKS
 * like horizontal overflow because it captures past the fixed rail; the scroller says otherwise.
 * The eye and the box disagree here, and the box is right.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("no horizontal overflow from this page's own row at 900px", async ({ page }) => {
  await openRoute(page, "/manuscripts/comps", { width: 900, height: 900 });
  const r = await page.evaluate(() => {
    const sc = document.querySelector(".ctpage .wpg-scroll") as HTMLElement;
    const row = document.querySelector(".ct-toprow") as HTMLElement;
    const body = document.querySelector(".ct-pagebody") as HTMLElement;
    const widest = [...document.querySelectorAll<HTMLElement>(".ct-pagebody *")]
      .map((e) => ({ n: (e.className || e.tagName).toString().slice(0, 28), r: e.getBoundingClientRect().right }))
      .sort((a, b) => b.r - a.r)[0];
    return {
      scrollW: sc.scrollWidth, clientW: sc.clientWidth, xOverflow: sc.scrollWidth - sc.clientWidth,
      rowW: Math.round(row.getBoundingClientRect().width),
      bodyW: Math.round(body.getBoundingClientRect().width),
      widest: widest ? `${widest.n} right=${Math.round(widest.r)}` : "none",
      shellOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log(`  scroller ${r.clientW}px, content ${r.scrollW}px → x-overflow ${r.xOverflow}`);
  console.log(`  row ${r.rowW} · body ${r.bodyW} · widest: ${r.widest} · shell x-overflow ${r.shellOverflow}`);
  expect(r.rowW, "the top row is wider than the page body").toBeLessThanOrEqual(r.bodyW + 1);
  expect(r.xOverflow, "this page's scroller overflows horizontally").toBeLessThanOrEqual(1);
});

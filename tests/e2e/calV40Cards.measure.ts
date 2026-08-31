import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ ONE CARD PER RELATIONSHIP — THE COMPOSED ASSERTION THE OLD MODEL FAILED ON EVERY MARKED ROW.
 *
 * The defect this replaces was not a wrong value anywhere: every fragment had a correct width, a
 * correct tone and a correct position, and a lock over any one of them passed. What was wrong was
 * the COUNT — a relationship drawn as three pieces because three status changes cut it — which is
 * only visible by grouping the painted cards under the thing they are meant to represent.
 *
 * The other two cases are the same claim from the other side: with nothing cutting the bar, marks
 * ride ON it, and a mark is only "riding" if it is inside its card's box and the words start clear
 * of it. Both are read off painted rectangles; neither can be satisfied by a declaration.
 */
const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
  const marks = [...document.querySelectorAll(".tl-mk2")].filter(vis) as HTMLElement[];
  const box = (e: HTMLElement) => { const r = e.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  return cards.map((c) => {
    const cb = box(c);
    // a mark belongs to this card when its centre is on the card's own line
    const on = marks.filter((m) => { const mb = box(m);
      return mb.cy > cb.t - 34 && mb.cy < cb.b + 34 && mb.cx > cb.l - 60 && mb.cx < cb.r + 60; });
    const kids = [...c.children].filter(vis).map((k) => box(k as HTMLElement));
    return { rel: c.getAttribute("data-rel") || "", cb, tier: c.getAttribute("data-tier") || "none",
      marks: on.map((m) => { const mb = box(m); return { cx: mb.cx, l: mb.l, r: mb.r }; }),
      kids: kids.map((k) => ({ l: k.l, r: k.r })),
      contentLeft: kids.length ? Math.min(...kids.map((k) => k.l)) : null };
  });
});

test("exactly one card per relationship", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const rows = await read(page);
  const per = new Map<string, number>();
  for (const r of rows) per.set(r.rel, (per.get(r.rel) ?? 0) + 1);
  const named = [...per.entries()].filter(([k]) => k);
  // ⚠️ POPULATION FIRST: a board that drew nothing satisfies "no relationship has two cards".
  expect(named.length, "relationships drawn").toBeGreaterThan(8);
  const worst = Math.max(...named.map(([, n]) => n));
  const marked = rows.filter((r) => r.marks.length > 0).length;
  console.log(`relationships ${named.length} · cards ${rows.length} · worst per relationship ${worst} · cards carrying marks ${marked}`);
  // ⚠️ AND MARKED CARDS MUST EXIST, or the claim is about a board with nothing to fragment.
  expect(marked, "cards carrying at least one mark").toBeGreaterThan(3);
  expect(named.filter(([, n]) => n > 1).map(([k]) => k), "relationships drawn as more than one card").toEqual([]);
});

test("marks ride on their card, and the words start clear of them", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const rows = (await read(page)).filter((r) => r.marks.length > 0);
  expect(rows.length, "cards carrying marks").toBeGreaterThan(3);
  const stray = rows.flatMap((r) => r.marks
    .filter((m) => m.cx < r.cb.l - 0.6 || m.cx > r.cb.r + 0.6)
    .map((m) => `${r.rel}: mark centre ${m.cx.toFixed(1)} outside card ${r.cb.l.toFixed(1)}–${r.cb.r.toFixed(1)}`));
  expect(stray, "marks painted off their own card").toEqual([]);
  /**
   * ⚠️ NON-OVERLAP, NOT ORDER — and the difference is a rung of the ladder.
   *
   * This was "the content's left edge is right of every mark's right edge", which was the right
   * claim while every card carried words. At the `pill` rung there are none: the pill goes back to
   * the card's own left edge, AHEAD of every mark, which is a correct arrangement that an ordering
   * test calls a failure. What was ever meant is that nothing a reader has to read shares pixels
   * with a disc, and that is true in both arrangements — so it is stated directly, and it is the
   * stronger claim besides: ordering permits a 22px mark sitting on a pill that starts 4px later.
   */
  const clash = rows.flatMap((r) => r.kids.flatMap((k) => r.marks
    .filter((m) => k.l < m.r - 0.6 && k.r > m.l + 0.6)
    .map(() => `${r.rel} [${r.tier}]: content ${k.l.toFixed(0)}–${k.r.toFixed(0)} shares pixels with a mark`)));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.tier] = (tally[r.tier] ?? 0) + 1;
  console.log(`checked ${rows.length} marked cards · tiers ${JSON.stringify(tally)}`);
  expect(clash, "content painted over a mark").toEqual([]);
});

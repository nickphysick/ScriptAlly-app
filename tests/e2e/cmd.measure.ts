import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
for (const W of [1280, 1920]) {
test(`the command row splits over the columns — ${W}`, async ({ page }) => {
  await openRoute(page, "/queries", { width: W, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(800);
  await page.locator(".qc-card").first().click();
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.qc-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const body = g.querySelector(".f12-body") as HTMLElement;
    const bar = g.querySelector(".wpg-bar") as HTMLElement;
    const lh = g.querySelector(".qc-lhead") as HTMLElement;
    const ph = g.querySelector(".qc-phead") as HTMLElement;
    const list = g.querySelector(".f12-list") as HTMLElement;
    const pane = g.querySelector(".f12-body > :nth-child(4)") as HTMLElement | null;
    const bx = (e: HTMLElement | null) => e ? { l: Math.round(e.getBoundingClientRect().left), r: Math.round(e.getBoundingClientRect().right) } : null;
    const cs = getComputedStyle(body);
    return {
      cols: cs.gridTemplateColumns, gap: cs.columnGap,
      lhead: bx(lh), phead: bx(ph), list: bx(list),
      /* the chrome total: the bar plus the command row */
      barH: Math.round(bar.getBoundingClientRect().height),
      rowH: lh ? Math.round(Math.max(lh.getBoundingClientRect().height, ph!.getBoundingClientRect().height)) : 0,
      search: !!lh?.querySelector(".f12-lsearch"),
      logq: !!ph?.querySelector(".qc-logq"),
      listHasHead: !!list?.querySelector(".f12-lhead"),
    };
  });
  console.log(`${W} ${JSON.stringify(r)}`);
  expect(r.search, "the list's search is not in the left cell").toBe(true);
  expect(r.logq, "`Log new query` is not in the right cell").toBe(true);
  expect(r.listHasHead, "the list panel still draws its own header").toBe(false);
  /* ⚠️ THE CELLS SIT OVER THEIR COLUMNS — asserted as geometry, because "same grid" is a claim about
     where things END UP rather than about which declaration they read. */
  expect(r.lhead!.l, "the left cell does not start where the list does").toBe(r.list!.l);
  expect(r.lhead!.r, "the left cell does not end where the list does").toBe(r.list!.r);
  expect(r.phead!.l, "the right cell does not start where the pane does").toBeGreaterThan(r.list!.r);
});
}

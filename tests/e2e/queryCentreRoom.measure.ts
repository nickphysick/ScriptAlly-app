/**
 * WHAT THE HEADER COSTS THE QUERY CENTRE — at rest and once collapsed.
 *
 * ⚠️ BOTH FIGURES, NOT ONE. The resting header grew 96 → 128, which takes another 32px from the
 * page that had least to spare; engagement collapse hands 76px back on the first click. Reporting
 * only the cost would say the page got worse, and only the gain would say it got better. The
 * question is whether the RESTING state alone is workable at 1280×800, so that is measured too.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const room = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n);
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const wsh = g.querySelector(".wsh") as HTMLElement;
  /* the tallest pane that actually scrolls — the working surface the user reads in */
  const panes = [...g.querySelectorAll("*")].map((el) => el as HTMLElement)
    .filter((e) => { const oy = getComputedStyle(e).overflowY; return oy === "auto" || oy === "scroll"; })
    .map((e) => ({ cls: e.className.toString().split(" ")[0].slice(0, 16), h: r(e.clientHeight), over: e.scrollHeight - e.clientHeight }))
    .filter((p) => p.h > 0)
    .sort((a, b) => b.h - a.h);
  return {
    working: g.classList.contains("wpg--working"),
    headerBlock: r(wsh.getBoundingClientRect().height),
    row1: r((g.querySelector(".wpg-plate") as HTMLElement).getBoundingClientRect().height),
    scrollRow: r(sc.getBoundingClientRect().height),
    pageScroll: sc.scrollHeight - sc.clientHeight,
    tallestPane: panes[0] ? `${panes[0].cls} ${panes[0].h}` : "—",
    panesScroll: panes.some((p) => p.over > 2),
  };
});

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`Query Centre room ${vp.width}x${vp.height}`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    const rest = await room(page);
    const box = await page.locator(".wpg-scroll").filter({ visible: true }).first().boundingBox();
    await page.mouse.click(box!.x + 3, box!.y + 6);
    await page.waitForTimeout(450);
    const work = await room(page);
    console.log(`\n══ QUERY CENTRE · ${vp.width}x${vp.height} ══`);
    console.table([
      { state: "rest", ...rest },
      { state: "engaged", ...work },
      {
        state: "delta",
        working: "—",
        headerBlock: work.headerBlock - rest.headerBlock,
        row1: work.row1 - rest.row1,
        scrollRow: work.scrollRow - rest.scrollRow,
        pageScroll: work.pageScroll - rest.pageScroll,
        tallestPane: `${rest.tallestPane} → ${work.tallestPane}`,
        panesScroll: "—",
      },
    ]);
  });
}

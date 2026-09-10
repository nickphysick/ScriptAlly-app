import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * §6 · the refdiff — SCOPED TO THE FOUR LAYOUT CHANGES, and deliberately no wider.
 *
 * ⚠️ THIS DOES NOT ASSERT THE PAGE MATCHES THE REF'S DRAWING. `qc-calendar-ref-v1.html` draws a
 * `.ruler` and a `.lanes`, and that board is a SKETCH: the real board renders from v65 and its
 * interior is out of this pack's scope. A refdiff run over the whole page would assert the app
 * matches a drawing of a board, which is the one thing it must not do. What the ref is normative
 * for is where things SIT: a bare rail, a header row above the board, a density pill, no winbar.
 *
 * ⚠️ AND IT TARGETS THE REF'S FOURTEEN REAL PROBES, BY CLASS WHERE NO PROBE EXISTS. The ref carries
 * `page railtop header-row search views rail court-list field-filter board ruler lanes popover
 * today-dot today-line`. Eight names it was described with — `range-nav range showing board-search
 * view-switch field-group field-sort board-col` — are absent, and most of those are classes
 * (`.nav`, `.range`, `.showing`, `.searchbox`, `.views`, `.boardcol`). Inventing probes to match a
 * description would make the ref agree with its paperwork rather than with itself.
 */
const WIDTHS = [1280, 1536, 1710, 1920, 2520];

for (const w of WIDTHS) {
  test(`§6 · the four layout changes hold at ${w}`, async ({ page }) => {
    await openRoute(page, "/queries", { width: w, height: 1000 });
    await page.evaluate(() => {
      const l = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0)[0];
      l.setAttribute("data-qc-live", "1");
    });
    await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
    await page.waitForTimeout(1300);
    /* ⚠️ PARK THE POINTER BEFORE READING A RESTING VALUE. The click that opened this view leaves
       the mouse over the board, and the board occupies most of the page — so `.qcc-calboard:hover`
       matches and the density pill is correctly at 1. Read that way it looks like a defect and is
       the harness's own cursor. Measured: `reduced: false`, `hoveredByPointer: true`. */
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);

    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector<HTMLElement>("[data-qc-live] " + s);
      const R = (s: string) => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2),
                 r: +(b.x + b.width).toFixed(2), bot: +(b.y + b.height).toFixed(2) }; };
      return {
        rail: R(".qcc-cal-rail"), railBg: q(".qcc-cal-rail") ? getComputedStyle(q(".qcc-cal-rail")!).backgroundColor : null,
        railShadow: q(".qcc-cal-rail") ? getComputedStyle(q(".qcc-cal-rail")!).boxShadow : null,
        head: R(".qcc-calhead"), board: R(".qcc-calboard"),
        search: R(".qcc-calsearch"), views: R(".qvs"), pill: R(".qcc-denspill"),
        winbar: !!q(".tl-winbar"),
        pillOpacity: q(".qcc-denspill") ? getComputedStyle(q(".qcc-denspill")!).opacity : null,
      };
    });

    const miss: string[] = [];
    /* 1 · a bare rail, 236px */
    if (!m.rail) miss.push("no rail");
    else {
      if (Math.abs(m.rail.w - 236) > 1) miss.push(`rail is ${m.rail.w}px, not 236`);
      if (m.railBg !== "rgba(0, 0, 0, 0)") miss.push(`rail has a fill: ${m.railBg}`);
      if (m.railShadow !== "none") miss.push(`rail has a shadow: ${m.railShadow}`);
    }
    /* 2 · the header row above the board, starting at its left edge */
    if (!m.head || !m.board) miss.push("no header row or board");
    else {
      if (Math.abs(m.head.x - m.board.x) > 1) miss.push(`header left ${m.head.x} vs board left ${m.board.x}`);
      if (m.head.bot > m.board.y + 1) miss.push("the header row is not above the board");
    }
    /* 3 · the density pill, bottom-right of the card, resting faint */
    if (!m.pill) miss.push("no density pill");
    else if (m.board) {
      if (Math.abs(m.board.r - m.pill.r - 14) > 1) miss.push(`pill right inset ${(m.board.r - m.pill.r).toFixed(2)}`);
      if (Math.abs(m.board.bot - m.pill.bot - 14) > 1) miss.push(`pill bottom inset ${(m.board.bot - m.pill.bot).toFixed(2)}`);
      if (Number(m.pillOpacity) > 0.5) miss.push(`pill rests at ${m.pillOpacity}, not faint`);
    }
    /* 4 · the winbar is gone */
    if (m.winbar) miss.push("the winbar still renders");

    /* the search is centred on the BOARD where the flanks allow — reported, not asserted; the
       arithmetic that forbids it below a ~950px board is recorded in `queryCalendarLayout.css` */
    const off = m.search && m.board
      ? +((m.search.x + m.search.w / 2) - (m.board.x + m.board.w / 2)).toFixed(2) : null;
    console.log(`REFDIFF ${w} misses=${miss.length} searchOffCentre=${off} searchW=${m.search?.w} board=${m.board?.w}`);
    if (miss.length) console.log("  " + miss.join("\n  "));
    expect(miss, `${miss.length} miss(es) at ${w}`).toEqual([]);
  });
}

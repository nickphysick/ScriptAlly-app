/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE STICKY CONTROL ROW — measured on the five scrolling pages (in-flow masthead, step 2).
 *
 * ⚠️ FOUR OF THE FIVE ROWS ARE BRAND NEW, so their sticky behaviour has never been seen by anyone.
 * Only the Contact list is drawn in `170-sticky-control-row.html`; Analytics, Discover, Comparable
 * titles and Submission packages gained their rows in step 1 of this pack. Two are worth naming:
 * Analytics puts a sticky row over CHARTS, a combination nothing else in the app has, and Packages
 * puts one over CARD GRIDS, which may sit oddly under a hairline.
 *
 * ⚠️ AND THE ONE CLAIM THAT ONLY A BROWSER CAN SETTLE IS MAX SCROLL. The row is inside the
 * scroller, so tightening its padding when it sticks would take that height out of `scrollHeight`
 * — and on a page overflowing by a few pixels that clamps `scrollTop`, unsticks the row, and
 * cycles. The unit lock checks the arithmetic of the compensating margin; this checks the pixels.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const SCROLLING: [string, string][] = [
  ["Contact list", "/agents"],
  ["Analytics", "/queries/analytics"],
  ["Discover", "/agents/discover"],
  ["Comparable titles", "/manuscripts/comps"],
  ["Submission packages", "/manuscripts/packages"],
];

const read = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /* ⚠️ THE FIRST `.wpg` IN THE DOCUMENT MAY BELONG TO A HIDDEN SLOT — the workspace keeps every
     page mounted and toggles `display`, so pick the one with a box. */
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  if (!row || !mast) return { noRow: !row, noMast: !mast } as never;
  const cs = getComputedStyle(row);
  const rb = row.getBoundingClientRect();
  const sb = sc.getBoundingClientRect();
  return {
    position: cs.position,
    top: cs.top,
    zIndex: cs.zIndex,
    background: cs.backgroundColor,
    padTop: r(parseFloat(cs.paddingTop)),
    marginBottom: r(parseFloat(cs.marginBottom)),
    shadow: cs.boxShadow,
    stuckClass: row.className.includes("wpg-tools--stuck"),
    /* the row's own margin box — what `scrollHeight` actually counts */
    marginBox: r(rb.height + parseFloat(cs.marginBottom)),
    rowTop: r(rb.top - sb.top),
    mastH: r(mast.getBoundingClientRect().height),
    /* has the masthead actually scrolled out of the scrollport? — the precondition of the
       invariance claim, and it must be read rather than assumed from the scroll distance */
    mastGone: mast.getBoundingClientRect().bottom <= sb.top + 0.5,
    maxScroll: r(sc.scrollHeight - sc.clientHeight),
    scrollTop: r(sc.scrollTop),
    /* ⚠️ WHAT OWNS THE PIXEL JUST UNDER THE ROW once it is stuck — the check that the row is
       actually covering content rather than letting it show through. Coordinates proved on screen
       first: `elementsFromPoint` outside the viewport returns an EMPTY array, and an assertion
       against `stack[0]` is then satisfied by `undefined`. */
    coverProbe: (() => {
      const x = rb.left + rb.width / 2;
      const y = rb.top + rb.height / 2;
      if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) return "OFF-SCREEN";
      const stack = document.elementsFromPoint(x, y) as HTMLElement[];
      /* ⚠️ THE TOPMOST ELEMENT WILL BE ONE OF THE ROW'S OWN CHILDREN, NOT THE ROW — a search input,
         a button, a tally. The first draft asserted `wpg-tools` was in the top three and failed on a
         correct page reading `INPUT < agl-search < agl-toolbar`. What is actually being asked is
         "does the row own this pixel", which is `contains`, not a class-name search. */
      return stack[0] && row.contains(stack[0])
        ? `ROW (${stack[0].className || stack[0].tagName})`
        : `NOT THE ROW: ${stack.slice(0, 3).map((e) => e.className || e.tagName).join(" < ")}`;
    })(),
  };
});

const wheelTo = async (page: Page, y: number) => {
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, y);
  await page.waitForTimeout(450);
};

test("the sticky control row, on all five scrolling pages", async ({ page }) => {
  const bar = await scrollbarWidth(page).catch(() => -1);
  const lines: string[] = [`scrollbar width: ${bar}px (the harness's one blind spot — macOS decides this)`];

  for (const [name, route] of SCROLLING) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const rest = await read(page);
    if (!rest) { lines.push(`${name}: NO GRID`); continue; }

    await wheelTo(page, 600);
    const moved = await read(page)!;
    /* back to the top, so the rest reading is reproducible rather than order-dependent */
    await wheelTo(page, -2000);
    const back = await read(page)!;

    lines.push(
      `\n══ ${name} (${route})`,
      `   position ${rest.position} · top ${rest.top} · z ${rest.zIndex} · bg ${rest.background}`,
      `   REST    padTop ${rest.padTop} mb ${rest.marginBottom} box ${rest.marginBox} · rowTop ${rest.rowTop} · masthead ${rest.mastH} · maxScroll ${rest.maxScroll} · stuck=${rest.stuckClass}`,
      `   SCROLLED padTop ${moved.padTop} mb ${moved.marginBottom} box ${moved.marginBox} · rowTop ${moved.rowTop} · scrollTop ${moved.scrollTop} · maxScroll ${moved.maxScroll} · stuck=${moved.stuckClass}`,
      `   RETURNED maxScroll ${back.maxScroll} · stuck=${back.stuckClass}`,
      `   covers: ${moved.coverProbe}`,
      `   shadow when stuck: ${moved.shadow}`,
    );

    /* ── the contract ── */
    expect(rest.position, `${name}: the control row is not sticky`).toBe("sticky");
    expect(rest.top, `${name}: the row takes a non-zero top offset — that is another element's height encoded as a literal`).toBe("0px");
    expect(rest.stuckClass, `${name}: the row rendered stuck before anything scrolled`).toBe(false);

    /* ⚠️ ONLY PAGES THAT ACTUALLY OVERFLOW CAN BE ASKED ABOUT STICKING. A short page at 1440×900 is
       not a failure — it is a page with nothing to scroll — and asserting on it would fail for a
       reason that has nothing to do with the row. */
    if (rest.maxScroll > 10) {
      const mastGone = moved.mastGone;
      expect(moved.stuckClass, `${name}: the row did not stick after scrolling ${moved.scrollTop}px`).toBe(true);
      expect(moved.rowTop, `${name}: the row is not pinned to the scroller's top edge once stuck`).toBeLessThanOrEqual(1);
      expect(moved.shadow, `${name}: the stuck row draws no edge`).not.toBe("none");
      /**
       * ⚠️ MAX SCROLL IS THE WHOLE POINT, AND THIS IS THE PROPERTY THE DELETED PADDING EXISTED TO
       * GUARANTEE. Identical in both states, or a barely-overflowing page clamps, unsticks and
       * cycles. 1px of tolerance for sub-pixel layout, not 4.
       *
       * ⚠️ IT IS TRUE BY CONSTRUCTION NOW RATHER THAN BY COMPENSATION, which is exactly why it has
       * to keep being MEASURED. `--wpg-reclaim-pad` used to hold this by adding back, in the
       * scroller's foot, precisely what a condensing header took out of the flow — five tokens of
       * arithmetic. The masthead is content and changes no heights, so nothing needs adding back
       * and the padding is retired (step 4). A property that holds by construction is one nobody
       * thinks to check, and the construction is a paragraph of CSS anyone can change.
       *
       * ⚠️ AND THE CLAIM IS ONLY WORTH ANYTHING IF THE MASTHEAD ACTUALLY LEFT — see the assertion
       * below. Max scroll being constant across a scroll that never moved the masthead out of view
       * is a measurement of nothing.
       */
      expect(mastGone, `${name}: the masthead is still in view after scrolling ${moved.scrollTop}px — the invariance claim is about a state the page never reached`).toBe(true);
      expect(Math.abs(moved.maxScroll - rest.maxScroll), `${name}: max scroll moved ${rest.maxScroll} → ${moved.maxScroll} when the row stuck`).toBeLessThanOrEqual(1);
      expect(moved.marginBox, `${name}: the row's margin box changed when it stuck — that is what moves max scroll`).toBeCloseTo(rest.marginBox, 0);
      expect(back.stuckClass, `${name}: the row stayed stuck after returning to the top`).toBe(false);
      expect(moved.coverProbe, `${name}: the probe went off-screen — its answer means nothing`).not.toBe("OFF-SCREEN");
      expect(moved.coverProbe, `${name}: content shows through the sticky row`).toContain("ROW (");
    } else {
      lines.push(`   (does not overflow at 1440×900 — sticking not exercised)`);
    }
  }
  console.log(lines.join("\n"));
});

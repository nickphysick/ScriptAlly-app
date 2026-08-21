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
import { openRoute, scrollbarWidth, liftMotionSuppression } from "./measure";

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
    /* the mini bar above it — the row's `top` is supposed to BE this, and the two are one token */
    miniH: r((g.querySelector(".wpg-mini") as HTMLElement | null)?.getBoundingClientRect().height ?? -1),
    miniStuckH: r((g.querySelector(".wpg-mini--stuck") as HTMLElement | null)?.getBoundingClientRect().height ?? 0),
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
    /**
     * ⚠️ AMENDED (masthead rethink, step 3). This asserted `top: 0px`, on the rule that a non-zero
     * offset is another element's height encoded as a literal — the `calc(56px + gap)` fault. The
     * mini bar sits above the row now, so the offset is non-zero by design.
     *
     * ⚠️ WHAT MADE THE ORIGINAL FAULT A FAULT IS UNCHANGED AND IS WHAT IS ASSERTED: the clearance
     * must be DERIVED, not matched. So the row's `top` is compared against the mini bar's own
     * rendered height, measured on the same page in the same state — if the two ever disagree, one
     * of them has been given a number of its own.
     */
    expect(rest.top, `${name}: the row's top is "${rest.top}" — it should clear the mini bar`).not.toBe("0px");
    expect(rest.stuckClass, `${name}: the row rendered stuck before anything scrolled`).toBe(false);

    /* ⚠️ ONLY PAGES THAT ACTUALLY OVERFLOW CAN BE ASKED ABOUT STICKING. A short page at 1440×900 is
       not a failure — it is a page with nothing to scroll — and asserting on it would fail for a
       reason that has nothing to do with the row. */
    if (rest.maxScroll > 10) {
      const mastGone = moved.mastGone;
      expect(moved.stuckClass, `${name}: the row did not stick after scrolling ${moved.scrollTop}px`).toBe(true);
      expect(moved.miniStuckH, `${name}: the mini bar did not grow when the page stuck`).toBeGreaterThan(0);
      expect(moved.rowTop, `${name}: the row is at ${moved.rowTop} once stuck, not beneath the ${moved.miniStuckH}px mini bar`)
        .toBeCloseTo(moved.miniStuckH, 0);
      /* the row's declared offset and the bar's rendered height are one figure, from two directions */
      expect(parseFloat(moved.top), `${name}: the row declares top ${moved.top} but the bar renders ${moved.miniStuckH}px`)
        .toBeCloseTo(moved.miniStuckH, 0);
      expect(moved.shadow, `${name}: the stuck row draws no edge`).not.toBe("none");
      /**
       * ══ THE INVARIANCE, RESTATED AS WHAT IT WAS ALWAYS PROTECTING ═══════════════════════════
       *
       * ⚠️ MAX SCROLL IS NO LONGER CONSTANT, AND IT SHOULD NOT BE. The mini bar grows 0 → its own
       * the scroller when the page sticks, so `scrollHeight` grows by exactly that — measured on
       * Contact list, 1095 → 1138. Asserting equality here would be asserting that the bar does not
       * exist.
       *
       * ⚠️ SO WHAT IS ASSERTED IS THE PROPERTY THE EQUALITY WAS A PROXY FOR: THE CONTENT DOES NOT
       * JUMP. The original fear, in the words of the rule it replaces, was "a page overflowing by
       * less than the reclaim is clamped to 0, the header returns, and it cycles" — a number moving
       * was only ever bad because of what it did to the reader's eye and to `scrollTop`.
       *
       * ⚠️ AND THE BROWSER IS WHAT MAKES IT SAFE, WHICH IS WORTH STATING BECAUSE IT IS NOT OBVIOUS.
       * Chrome's SCROLL ANCHORING absorbs the insertion: measured on Contact list, a 10px wheel tick
       * takes `scrollTop` from 0 to 53 — the 10 the user asked for plus the 43 the bar just took —
       * and a content landmark moves exactly 10px. The reader sees a 10px scroll. Without anchoring
       * the same content would lurch half a bar-height down on the first tick, which is why this is
       * measured rather than reasoned about.
       *
       * ⚠️ AND THE OSCILLATION CANNOT RETURN, because the change is a GROWTH and it happens on the
       * way down. Unsticking only occurs at `scrollTop <= 2`, where there is nothing to clamp.
       */
      expect(moved.miniStuckH, `${name}: no mini bar — the growth below would be unexplained`).toBeGreaterThan(0);
      /* ⚠️ 1px, AND THE REASON IS THE UNITS RATHER THAN THE MEASUREMENT. `scrollHeight` is an
         INTEGER; the bar's height is derived from its type and lands on 42.7. An integer delta can
         never equal a fractional height exactly, so a 0.5 tolerance fails on a page that is behaving
         perfectly — measured, Submission packages: bar 42.7, max scroll 303 → 345, a delta of 42.
         This was exact while the bar was a round 51 and stopped being exact when the height started
         deriving, which is a fact about `scrollHeight`, not a loosening of the claim. */
      expect(Math.abs((moved.maxScroll - rest.maxScroll) - moved.miniStuckH),
        `${name}: max scroll moved ${rest.maxScroll} → ${moved.maxScroll} (${moved.maxScroll - rest.maxScroll}), which is not the mini bar's ${moved.miniStuckH}px`)
        .toBeLessThanOrEqual(1);
      expect(back.maxScroll, `${name}: max scroll did not return to its resting value once the bar folded away`)
        .toBeCloseTo(rest.maxScroll, 0);
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

test("⚠️ THE CONTENT DOES NOT JUMP WHEN THE MINI BAR ARRIVES", async ({ page }) => {
  /**
   * The bar takes ~43px of flow the instant the page sticks, and everything after it moves down by
   * that much. What stops the reader seeing a lurch is the browser's scroll anchoring, which raises
   * `scrollTop` by the same 43 — so this asserts the OUTCOME rather than trusting the mechanism:
   * after a small wheel tick, a content landmark must have moved by the tick, not by the bar.
   *
   * ⚠️ A SMALL TICK ON PURPOSE. A 600px scroll would swamp a 51px error; the fault this guards
   * against is visible precisely at the threshold, on the first tick that crosses it.
   *
   * ⚠️⚠️ SCROLL ANCHORING IS LOAD-BEARING HERE, AND IT IS A BROWSER BEHAVIOUR THIS CODEBASE DOES
   * NOT CONTROL. If this case fails with the landmark moving ~51px instead of ~10, the most likely
   * cause is NOT the mini bar: it is that `overflow-anchor: none` has been added somewhere on an
   * ancestor of the scroller — a common fix for an unrelated flicker, and it silently disables the
   * compensation this depends on. Check for it before touching anything in this pack.
   *
   * It also VARIES BY BROWSER: Chrome and Firefox implement anchoring, Safari's behaviour differs,
   * and the harness only ever asks Chromium. So this case proves the property holds where it is
   * measured, and does not prove it holds everywhere — which is the honest reading of any
   * single-engine measurement, and worth remembering before it is quoted as settled.
   */
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const probe = () => page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.agl-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const sc = g.querySelector(".wpg-scroll") as HTMLElement;
    const mini = g.querySelector(".wpg-mini") as HTMLElement;
    const card = g.querySelector("[data-agent-card]") as HTMLElement | null;
    return {
      scrollTop: Math.round(sc.scrollTop),
      mini: Math.round(mini.getBoundingClientRect().height),
      cardY: card ? Math.round(card.getBoundingClientRect().top) : -1,
    };
  });
  const before = await probe();
  expect(before.mini, "the bar already has height at rest").toBe(0);
  expect(before.cardY, "no content landmark on the page — the probe has nothing to watch").toBeGreaterThan(0);

  const TICK = 10;
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, TICK);
  await page.waitForTimeout(450);
  const after = await probe();

  expect(after.mini, "the bar did not appear — the jump this case guards against cannot occur, so it is asserting nothing").toBeGreaterThan(0);
  /* ⚠️ THE CONTENT MOVED BY THE TICK, NOT BY THE BAR. A 2px tolerance for sub-pixel scroll, not 43. */
  expect(before.cardY - after.cardY, `the content moved ${before.cardY - after.cardY}px for a ${TICK}px scroll — the mini bar's ${after.mini}px arrival is being paid by the reader's eye`)
    .toBeCloseTo(TICK, 0);
  /* and the browser paid it in `scrollTop`, which is the mechanism — recorded, not relied upon */
  console.log(`\ncontent-jump: tick ${TICK}px · scrollTop ${before.scrollTop} → ${after.scrollTop} · bar ${after.mini} · landmark moved ${before.cardY - after.cardY}px`);
});

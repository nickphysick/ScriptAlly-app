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
  /* ⚠️ THE SUBJECT IS THE SLAB (pinned chrome, §1) — masthead and control row in one sticky block.
     The row is no longer sticky on its own, and asserting that it is would be asserting the
     arrangement this pack replaced. `hasRow` survives for the pages that still draw controls. */
  const row = g.querySelector(".wpg-chrome") as HTMLElement | null;
  const tools = g.querySelector(".wpg-tools") as HTMLElement | null;
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  /* ⚠️ `hasRow` IS A READING, NOT AN ERROR. A scrolling page without a control row is a real state
     since the Packages restructure; the caller skips its row claims and asserts the population. */
  if (!row || !mast) return { hasRow: false, noMast: !mast } as never;
  const cs = getComputedStyle(row);
  const rb = row.getBoundingClientRect();
  const sb = sc.getBoundingClientRect();
  return {
    hasRow: true,
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
    stuckClass: row.className.includes("wpg-chrome--stuck"),
    hasTools: !!tools,
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

test("the sticky chrome slab, on every scrolling page", async ({ page }) => {
  const bar = await scrollbarWidth(page).catch(() => -1);
  const lines: string[] = [`scrollbar width: ${bar}px (the harness's one blind spot — macOS decides this)`];
  const exercised: { name: string; ran: boolean }[] = [];

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

    /**
     * ⚠️ A CONTROL ROW IS NO LONGER UNIVERSAL — Submission packages lost its row to another stream's
     * restructure, and this whole file is ABOUT the row, so that page now sits outside its subject
     * rather than failing it. The title said "all five scrolling pages"; it says what it means now.
     *
     * ⚠️ AND THE SKIP IS PAIRED WITH A POPULATION ASSERTION AFTER THE LOOP, because a skip that can
     * silently apply to every page turns the whole measurement green by measuring nothing.
     */
    if (!rest.hasRow) {
      lines.push(`   SKIPPED — this page renders no chrome slab`);
      exercised.push({ name, ran: false });
      continue;
    }
    exercised.push({ name, ran: true });

    /* ── the contract ── */
    expect(rest.position, `${name}: the chrome slab is not sticky`).toBe("sticky");
    /**
     * ⚠️ BACK TO `top: 0`, AND THIS TIME BY CONSTRUCTION (pinned chrome, §1). The rule has always
     * been that a sticky element's offset must not encode another element's height — the
     * `calc(56px + gap)` fault, silently wrong by 32px on the Tasks family. Step 3 allowed a
     * non-zero offset because the row cleared the mini bar and both READ ONE TOKEN, so they could
     * not drift.
     *
     * ⚠️ NOW THERE IS NOTHING ABOVE IT TO CLEAR, WHICH IS THE STRONGEST FORM THE RULE HAS TAKEN.
     * Masthead and controls are one slab and the slab is the scroller's only sticky element, so the
     * offset is zero not by agreement but because there is no second pinned thing.
     */
    expect(rest.top, `${name}: the slab's top is "${rest.top}" — something above the scroller is being measured into a rule again`).toBe("0px");
    expect(rest.stuckClass, `${name}: the slab rendered stuck before anything scrolled`).toBe(false);

    /* ⚠️ ONLY PAGES THAT ACTUALLY OVERFLOW CAN BE ASKED ABOUT STICKING. A short page at 1440×900 is
       not a failure — it is a page with nothing to scroll — and asserting on it would fail for a
       reason that has nothing to do with the row. */
    if (rest.maxScroll > 10) {
      expect(moved.stuckClass, `${name}: the row did not stick after scrolling ${moved.scrollTop}px`).toBe(true);
      expect(moved.shadow, `${name}: the stuck slab draws no shadow`).not.toBe("none");
      /**
       * ══ THE INVARIANCE, RESTATED FOR THE SLAB ══════════════════════════════════════════════
       *
       * ⚠️ MAX SCROLL IS CONSTANT AGAIN AT §1, AND THAT IS A PROPERTY OF THIS STEP RATHER THAN A
       * LAW. It moved while the mini bar existed, because the bar grew 0 → its own height inside the
       * scroller and `scrollHeight` grew with it. The slab neither grows nor shrinks when it pins —
       * nothing tightens yet — so the figure holds.
       *
       * ⚠️ AND §2 BREAKS THAT DELIBERATELY. The settle takes about half the chrome's height out of
       * the flow the instant the page pins, which is the SHRINK direction and therefore the
       * dangerous one: a page overflowing by less than the reclaim would be clamped back to 0, the
       * slab would un-settle, and it would cycle. §2 owns the compensation; this assertion is where
       * it will be proved.
       *
       * ⚠️ THE READER'S EYE IS THE REAL SUBJECT EITHER WAY, and it is measured separately below —
       * scroll anchoring is what made the bar's growth invisible, and the small-tick probe is what
       * proved it rather than reasoning about it.
       */
      expect(Math.abs(moved.maxScroll - rest.maxScroll),
        `${name}: max scroll moved ${rest.maxScroll} → ${moved.maxScroll} when the slab pinned — nothing in the chrome changes height at §1`)
        .toBeLessThanOrEqual(1);
      expect(back.maxScroll, `${name}: max scroll did not return to its resting value once the page came back to the top`)
        .toBeCloseTo(rest.maxScroll, 0);
      /* ⚠️ §1 ONLY: the slab's box is unchanged between the two states, because nothing yet tightens
         when it pins. §2 makes it settle DELIBERATELY, and this assertion is replaced there by a
         compensation that keeps max scroll constant — the shrink direction is the dangerous one. */
      expect(moved.marginBox, `${name}: the slab's margin box changed when it stuck — that is what moves max scroll`).toBeCloseTo(rest.marginBox, 0);
      expect(back.stuckClass, `${name}: the row stayed stuck after returning to the top`).toBe(false);
      expect(moved.coverProbe, `${name}: the probe went off-screen — its answer means nothing`).not.toBe("OFF-SCREEN");
      expect(moved.coverProbe, `${name}: content shows through the sticky row`).toContain("ROW (");
    } else {
      lines.push(`   (does not overflow at 1440×900 — sticking not exercised)`);
    }
  }
  console.log(lines.join("\n"));
  /* ⚠️ THE POPULATION — a run where every page skipped would otherwise pass having asserted nothing */
  const ran = exercised.filter((x) => x.ran).map((x) => x.name);
  expect(ran.length, `only ${ran.length} page(s) exercised the sticky row: ${JSON.stringify(exercised)}`).toBeGreaterThan(2);
});

test("⚠️ THE CONTENT DOES NOT JUMP WHEN THE CHROME PINS", async ({ page }) => {
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
    const slab = g.querySelector(".wpg-chrome") as HTMLElement;
    const card = g.querySelector("[data-agent-card]") as HTMLElement | null;
    return {
      scrollTop: Math.round(sc.scrollTop),
      chrome: Math.round(slab.getBoundingClientRect().height),
      cardY: card ? Math.round(card.getBoundingClientRect().top) : -1,
    };
  });
  const before = await probe();
  expect(before.chrome, "the chrome slab has no height at rest — the probe has nothing to watch change").toBeGreaterThan(0);
  expect(before.cardY, "no content landmark on the page — the probe has nothing to watch").toBeGreaterThan(0);

  const TICK = 10;
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, TICK);
  await page.waitForTimeout(450);
  const after = await probe();

  /**
   * ⚠️ AT §1 THE CHROME DOES NOT CHANGE HEIGHT, SO THIS CASE IS A BASELINE RATHER THAN A GUARD, AND
   * SAYING SO IS THE POINT. It was written against the mini bar, which grew 0 → its own height
   * inside the scroller and had to be absorbed by scroll anchoring or the reader saw a lurch. The
   * slab neither grows nor shrinks when it pins — yet.
   *
   * ⚠️ §2 IS WHAT MAKES IT LOAD-BEARING, and in the worse direction: the settle takes roughly half
   * the chrome out of the flow the instant the page pins. The precondition — that the chrome's
   * height actually MOVED — is asserted there, because a probe for a jump that cannot happen is
   * satisfied by nothing happening, which is this repo's most-repeated vacuous green.
   */
  const chromeDelta = Math.abs(after.chrome - before.chrome);
  /* ⚠️ THE CONTENT MOVED BY THE TICK, NOT BY THE CHROME. A 2px tolerance for sub-pixel scroll. */
  expect(before.cardY - after.cardY, `the content moved ${before.cardY - after.cardY}px for a ${TICK}px scroll — the chrome's ${chromeDelta}px change is being paid by the reader's eye`)
    .toBeCloseTo(TICK, 0);
  /* and the browser paid it in `scrollTop`, which is the mechanism — recorded, not relied upon */
  console.log(`\ncontent-jump: tick ${TICK}px · scrollTop ${before.scrollTop} → ${after.scrollTop} · chrome ${before.chrome} → ${after.chrome} · landmark moved ${before.cardY - after.cardY}px`);
});

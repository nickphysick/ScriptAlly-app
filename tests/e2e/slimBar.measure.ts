/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SLIM BAR AND THE HANDOFF ══════════════════════════════════════════════════════════════
 * (ref `design-refs/slim-header-scroll.html`, option A.)
 *
 * ⚠️ THE FULL HEADER IS NEVER ANIMATED — it scrolls away as content. So there is no settle to
 * compensate, no height to reclaim, and `scrollTop` must be identical across every transition: a
 * bar that reserved space would move the reader's place by its own height on arrival.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const PAGES: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg"   },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
];

const grid = (cls: string) => `[...document.querySelectorAll(".wpg.${cls}")].find((e) => e.getBoundingClientRect().height > 0)`;

const state = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const bar = g.querySelector(".wpg-bar") as HTMLElement | null;
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  const cs = bar ? getComputedStyle(bar) : null;
  return {
    y: Math.round(sc.scrollTop),
    max: sc.scrollHeight - sc.clientHeight,
    on: !!bar?.className.includes("--on"),
    barOpacity: cs ? parseFloat(cs.opacity) : -1,
    barH: bar ? Math.round(bar.getBoundingClientRect().height) : -1,
    /* the FULL header's own opacity — it must never fade; it leaves by scrolling */
    mastOpacity: mast ? parseFloat(getComputedStyle(mast).opacity) : -1,
    mastTop: mast ? Math.round(mast.getBoundingClientRect().top - sc.getBoundingClientRect().top) : 0,
    name: (bar?.querySelector("b") as HTMLElement | null)?.innerText?.trim() ?? null,
    cta: (bar?.querySelector(".wpg-barcta") as HTMLElement | null)?.innerText?.trim() ?? null,
  };
}, cls);

const scrollTo = (page: Page, cls: string, to: number) => page.evaluate(({ c, n }) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  (g.querySelector(".wpg-scroll") as HTMLElement).scrollTop = n;
}, { c: cls, n: to });

test("⚠️ THE BAR IS 44px, RESERVES NOTHING, AND CARRIES THE HEADER'S OWN CONTENT", async ({ page }) => {
  const lines: string[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const rest = await state(page, cls);
    /* ⚠️ THE LAYOUT IS IDENTICAL SHOWING OR NOT — `margin-bottom: -bar-h` against its own height.
       Measured as the masthead's own top inside the scroller, which cannot move if nothing is
       reserved above it. */
    expect(rest.mastTop, `${name}: the bar reserves space above the masthead at rest`).toBeLessThanOrEqual(1);
    expect(rest.barH, `${name}: the bar is not 44px`).toBe(44);
    expect(rest.on, `${name}: the bar is shown at rest`).toBe(false);
    expect(rest.barOpacity, `${name}: the bar is visible at rest`).toBe(0);
    if (rest.max > 200) {
      await scrollTo(page, cls, 300);
      await page.waitForTimeout(600);
      const on = await state(page, cls);
      expect(on.on, `${name}: the bar did not arrive`).toBe(true);
      expect(on.barOpacity, `${name}: the bar arrived without becoming opaque`).toBe(1);
      expect(on.name, `${name}: the bar arrived carrying no name`).toBeTruthy();
      /* ⚠️ AND THE FULL HEADER IS NOT ANIMATED — it left by scrolling, which is a position rather
         than an opacity. A masthead fading out is the settle coming back in another costume. */
      expect(on.mastOpacity, `${name}: the full header faded rather than scrolling away`).toBe(1);
      lines.push(`${name.padEnd(21)} "${on.name}"${on.cta ? ` · ${on.cta}` : ""}`);
    } else {
      lines.push(`${name.padEnd(21)} — only ${rest.max}px of scroll, no handoff here`);
    }
  }
  console.log("\n══ THE SLIM BAR (1440)\n" + lines.join("\n"));
  expect(lines.filter((l) => !l.includes("no handoff")).length, "no page handed off — the case measured nothing").toBeGreaterThan(2);
});

/**
 * ⚠️ ONE STATE CHANGE PER DIRECTION REVERSAL, AND `scrollTop` UNCHANGED ACROSS EVERY TRANSITION.
 * A 4px sweep is finer than any threshold gap, so a bar that flipped on a boundary would show it;
 * and this repo has already paid for a chrome change that moved the reader's place, twice.
 */
for (const { name, route, cls } of [PAGES[2], PAGES[1]]) {
  test(`⚠️ THE HANDOFF FLIPS ONCE PER DIRECTION AND HOLDS scrollTop — ${name}`, async ({ page }) => {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const first = await state(page, cls);
    expect(first.max, `${name}: nothing to scroll`).toBeGreaterThan(400);

    let flipsDown = 0, flipsUp = 0, prev = false;
    const drift: number[] = [];
    for (const [from, to, dir] of [[0, 400, "down"], [400, 0, "up"]] as const) {
      const step = dir === "down" ? 4 : -4;
      for (let y = from; dir === "down" ? y <= to : y >= to; y += step) {
        await scrollTo(page, cls, y);
        const s = await state(page, cls);
        /* ⚠️ THE POSITION IS UNCHANGED BY THE STATE CHANGE. The bar reserves no space, so setting
           `scrollTop` to y must leave it at y — a reserved 44px would show here as a jump. */
        drift.push(Math.abs(s.y - y));
        if (s.on !== prev) { if (dir === "down") flipsDown += 1; else flipsUp += 1; prev = s.on; }
      }
    }
    const worst = Math.max(...drift);
    console.log(`   ${name}: ${flipsDown} flip down · ${flipsUp} flip up · worst scrollTop drift ${worst}px`);
    expect(flipsDown, `${name}: the bar flipped ${flipsDown} times on the way down`).toBe(1);
    expect(flipsUp, `${name}: the bar flipped ${flipsUp} times on the way up`).toBe(1);
    expect(worst, `${name}: the handoff moved the reader's place by ${worst}px`).toBeLessThanOrEqual(1);
  });
}

/**
 * ⚠️ CONTENT PASSES BEHIND THE BAR — proved by sampling PAINTED PIXELS, not by reading a rule.
 *
 * This repo has shipped a see-through header FOUR times behind a green lock: `elementsFromPoint`
 * reports the DOM stack at a coordinate and never the colour rendered there, and `getComputedStyle`
 * once reported a `backdrop-filter` the browser had declined to apply. A single sample also passes
 * over blank ground while a card border shows through two inches away.
 *
 * ⚠️ TWO FAULTS, TWO CATCHERS, AND BOTH ARE PROVED RED SEPARATELY — which matters because the
 * cheaper one fires first and would otherwise leave the expensive one untested. An ALPHA fill is
 * caught by the computed-style guard below (`rgba(254, 252, 250, 0.82)` → "the bar's fill carries
 * alpha"), and the sweep never runs. A bar that is opaque but STACKED BELOW the content is
 * invisible to that guard and is what the pixels are for: dropping `z-index: 20` to `0` leaves
 * `backgroundColor` reading a perfectly good `rgb(254, 252, 250)` and turns 767 of 857 swept points
 * white. Proving only the first would have left the second a decoration.
 */
test("⚠️ NOTHING READS THROUGH THE BAR — swept, with a card beneath it", async ({ page }) => {
  const { route, cls } = PAGES[2];
  await openRoute(page, route, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await scrollTo(page, cls, 300);
  await page.waitForTimeout(700);
  const box = await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const b = (g.querySelector(".wpg-bar") as HTMLElement).getBoundingClientRect();
    return { x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) };
  }, cls);
  /* ⚠️ THE PRECONDITION: something must actually be passing behind it, or an opaque reading proves
     nothing. Sampled just below the bar — if that strip is the page's own ground the case is
     measuring blank paper. */
  const below = await page.evaluate(({ b }) => {
    const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height + 12);
    return el ? (el.className || el.tagName).toString().slice(0, 40) : null;
  }, { b: box });
  expect(below, "nothing is beneath the bar — the sweep would be over blank ground").toBeTruthy();

  const ground = await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return getComputedStyle(g.querySelector(".wpg-bar") as HTMLElement).backgroundColor;
  }, cls);
  expect(ground, "the bar's fill carries alpha — content will read through it").toMatch(/^rgb\(/);

  /**
   * ⚠️ THE SWEEP EXCLUDES THE BAR'S OWN INK BY MEASURING IT, NOT BY GUESSING A MARGIN.
   *
   * The first version sampled a fixed strip "between the measure's left edge and the text" and
   * reported three failures at x=38 — which is the ICON. The measure is inset by the gutter, so
   * there is no ground between the two, and the probe was reading the bar's foreground and calling
   * it bleed-through. Asking the browser where the children are makes the region correct on every
   * page and at every width, and lets the grid cover the WHOLE box, which is what the claim needs.
   */
  const ink = await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const bar = (g.querySelector(".wpg-bar") as HTMLElement).getBoundingClientRect();
    return [...g.querySelectorAll(".wpg-bar .wpg-barmk, .wpg-bar b, .wpg-bar .wpg-barcta")].map((e) => {
      const r = e.getBoundingClientRect();
      /* 2px of slack, because antialiasing bleeds a pixel past a glyph's own box */
      return { l: r.left - bar.left - 2, r: r.right - bar.left + 2, t: r.top - bar.top - 2, b: r.bottom - bar.top + 2 };
    });
  }, cls);
  expect(ink.length, "the bar drew no content — the exclusion would be vacuous").toBeGreaterThan(1);

  const { readPng } = await import("./pngPixels");
  const png = readPng(await page.screenshot({ clip: box }));
  const want = (/rgb\((\d+), (\d+), (\d+)\)/.exec(ground) ?? []).slice(1).map(Number);
  let sampled = 0, wrong = 0;
  const inInk = (x: number, y: number) => ink.some((k) => x >= k.l && x <= k.r && y >= k.t && y <= k.b);
  /**
   * ⚠️ THE WINDOW'S OWN CORNERS ARE NOT THE BAR'S GROUND, and the first run of this sweep reported
   * exactly one failure at (2,3) reading the DESK colour. `.ws-window` clips at a 16px radius and
   * the bar's top edge is the window's, so a pixel inside that arc is desk showing past the curve —
   * correct, and nothing to do with what the bar is filled with.
   *
   * ⚠️ THE RADIUS IS READ FROM THE WINDOW rather than typed, so a retone of the shell moves the
   * exclusion with it instead of reopening this as a mystery failure.
   */
  const radius = await page.evaluate(() => {
    const w = document.querySelector(".ws-window") as HTMLElement | null;
    return w ? parseFloat(getComputedStyle(w).borderTopLeftRadius) || 0 : 0;
  });
  const inCorner = (x: number, y: number) => {
    if (radius <= 0) return false;
    const cx = x < radius ? radius - x : x > box.width - radius ? x - (box.width - radius) : 0;
    const cy = y < radius ? radius - y : 0;   /* the bar meets only the window's TOP corners */
    return cx > 0 && cy > 0 && cx * cx + cy * cy > 0;
  };
  /* ⚠️ THE WHOLE BOX, MINUS ONE ROW AT THE BOTTOM: the bar's own hairline is inside its border box,
     and a border is not the ground. Everything else is swept. */
  for (let x = 2; x < box.width - 2; x += 9) {
    for (let y = 3; y < box.height - 2; y += 5) {
      if (inInk(x, y) || inCorner(x, y)) continue;
      const [r, g2, b2] = png.at(x, y);
      sampled += 1;
      if (Math.abs(r - want[0]) > 2 || Math.abs(g2 - want[1]) > 2 || Math.abs(b2 - want[2]) > 2) {
        if (wrong < 4) console.log(`   ⚠ (${x},${y}) → rgb(${r}, ${g2}, ${b2})`);
        wrong += 1;
      }
    }
  }
  console.log(`   swept ${sampled} points across the bar's ground, ${ink.length} ink boxes excluded · ${wrong} not the ground colour`);
  expect(sampled, "the sweep read nothing").toBeGreaterThan(200);
  expect(wrong, `${wrong} of ${sampled} points are not the bar's own ground — content is reading through`).toBe(0);
});

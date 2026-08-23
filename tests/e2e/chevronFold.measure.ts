/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOLD'S CHEVRON — ON THE WINDOW'S BORDER, NEVER THROUGH IT (pinned chrome, §3; ref 175).
 *
 * A fill page cannot scroll, so its masthead cannot leave by scrolling. Hide folds it — masthead and
 * hairline both — and what remains is one badge straddling the window's top edge, half in and half
 * out.
 *
 * ⚠️ THE CLAIM THAT NEEDS A RULER IS "IT SITS ON THE LINE AND DOES NOT CUT IT". A badge parented
 * inside the window is clipped by its radius; a badge spliced into the border's run breaks the one
 * continuous line the window is drawn with. Both look nearly right in a screenshot and neither is.
 * So the border is sampled ACROSS its full width, including under the badge.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

/**
 * ⚠️ TYPE B ONLY — AND IT WAS "FILL", WHICH IS THE DISTINCTION THIS PACK GOT WRONG. The fold belongs
 * to pages with NO single primary scroller; the Tasks family is `fill` and Type A, and it settles on
 * its zone instead. Hide beside a settle is two mechanisms for one job.
 *
 * ⚠️ THE LIST IS A ROUTE TABLE, NOT A CLAIM. Which pages are Type B is asserted in
 * `headerTypes.measure.ts` as a partition with no page names in it; these are the routes to open,
 * and each one's type is re-read from the page before anything is asserted about it.
 */
const FILL: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre", route: "/queries",     cls: "qc-wpg"  },
  { name: "Manuscripts",  route: "/manuscripts", cls: "msv-wpg" },
];

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const win = document.querySelector(".ws-window") as HTMLElement;
  const wrap = document.querySelector(".ws-winwrap") as HTMLElement;
  const badge = document.querySelector(".wpg-chevfold") as HTMLElement | null;
  /* ⚠️ THE WRAPPER, NOT THE HEADER. `.wpg-mast` is what folds — `max-height: 0` and `overflow:
     hidden` live on it — and `.wsh` inside keeps its own height throughout. Measuring the inner
     element reports "the masthead did not fold" about a masthead that folded perfectly. */
  const mast = g.querySelector(".wpg-mast") as HTMLElement | null;
  const slab = g.querySelector(".wpg-chrome") as HTMLElement | null;
  const wb = win.getBoundingClientRect();
  return {
    type: g.getAttribute("data-wpg-type"),
    hidden: g.classList.contains("wpg--hidden"),
    mastH: mast ? r(mast.getBoundingClientRect().height) : -1,
    /* the slab's hairline must go with the masthead — a boundary with nothing above it is chrome
       marking the edge of nothing */
    slabLine: slab ? getComputedStyle(slab).borderBottomColor : "absent",
    badge: badge ? { top: r(badge.getBoundingClientRect().top), h: r(badge.getBoundingClientRect().height), w: r(badge.getBoundingClientRect().width) } : null,
    /* ⚠️ THE BADGE MUST BE A SIBLING OF THE WINDOW, NOT A DESCENDANT — the window clips at its
       radius, so a child could never straddle the edge however it were positioned. */
    inWindow: badge ? win.contains(badge) : false,
    inWrap: badge ? wrap.contains(badge) && !win.contains(badge) : false,
    /* half in, half out: the badge's centre on the window's top edge */
    straddle: badge ? r(badge.getBoundingClientRect().top + badge.getBoundingClientRect().height / 2 - wb.top) : -1,
    winTop: r(wb.top), winLeft: r(wb.left), winRight: r(wb.right),
    /**
     * ⚠️ THE MASTHEAD'S CONTROLS, NOT THE CHROME REGION'S. The slab holds the control row too, and
     * that row is nothing but controls — Calendar's has seven. The rule this counts is the standing
     * one: THE MASTHEAD holds no actions except Hide. Counting the slab reported a page whose
     * toolbar works as a page that had broken the rule.
     */
    actionable: (() => {
      const inMast = [...g.querySelectorAll(".wpg-mast button, .wpg-mast a, .wpg-mast [role='button']")];
      return inMast.filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length;
    })(),
    badgeCount: document.querySelectorAll(".wpg-chevfold").length,
  };
}, cls);

/**
 * ⚠️ WHAT THIS PROVES, STATED EXACTLY, BECAUSE IT IS EASY TO OVERCLAIM. `.ws-window`'s edge is drawn
 * by an inset `box-shadow` on a `::after` overlay spanning `inset: 0` — one element, one line, the
 * full width. This walks the top edge and asserts that at every sampled x the WINDOW'S OWN BOX is
 * what occupies that pixel: nothing foreign has been spliced into the run, and the overlay has not
 * been shortened.
 *
 * ⚠️ IT DOES NOT PROVE THE LINE IS VISIBLE UNDER THE BADGE, AND IT SHOULD NOT. The badge is opaque
 * and its centre sits on the line, so for 38px the line is covered — which is the drawing rather
 * than a fault. "The border runs beneath it uninterrupted" means nothing CUT it, and the badge's
 * ground is the window's own so the eye reads it as resting on the line.
 *
 * ⚠️ THE FAULT THE PACK NAMES — a badge parented inside the window — is caught by `inWindow` above,
 * and was verified red by doing exactly that: portalling into `.ws-window` instead of its wrapper
 * fails with "the chevron is INSIDE the window — it will be clipped by the radius". This sampling
 * catches the other one: something drawn across the edge that is not the window at all.
 *
 * ⚠️ AND THE SAMPLE POINTS ARE PROVED ON SCREEN FIRST. `elementsFromPoint` outside the viewport
 * returns an EMPTY array, and an assertion satisfied by `undefined` is this repo's oldest vacuous
 * green.
 */
const sampleTopEdge = (page: Page) => page.evaluate(() => {
  const win = document.querySelector(".ws-window") as HTMLElement;
  const b = win.getBoundingClientRect();
  const y = Math.round(b.top + 0.5);          /* inside the top edge, past the border's own pixel */
  const out: { x: number; onWindow: boolean; top: string }[] = [];
  /* skip the rounded corners — the radius genuinely has no straight edge to sample */
  for (let x = Math.round(b.left) + 20; x < Math.round(b.right) - 20; x += 8) {
    if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) continue;
    const stack = document.elementsFromPoint(x, y);
    out.push({
      x,
      onWindow: stack.some((e) => e === win || win.contains(e)),
      top: (stack[0]?.className ?? stack[0]?.tagName ?? "?").toString().split(" ")[0].slice(0, 20),
    });
  }
  /* the overlay that draws the line — its box must still span the whole window */
  const after = getComputedStyle(win, "::after");
  return {
    y, viewportH: window.innerHeight, samples: out,
    edgeInset: `${after.left}/${after.right}`,
    edgeShadow: after.boxShadow,
  };
});

test("Hide folds the masthead to a chevron on the window's border, on every fill page", async ({ page }) => {
  const lines: string[] = [];
  for (const { name, route, cls } of FILL) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);

    const rest = await read(page, cls);
    expect(rest, `${name}: no grid`).not.toBeNull();
    /* the precondition: this route is genuinely Type B, read from the page rather than from the list */
    expect(rest!.type, `${name} is not a static page — the fold is Type B's alone`).toBe("static");
    expect(rest!.hidden, `${name}: the masthead is folded on arrival`).toBe(false);
    expect(rest!.mastH, `${name}: no masthead on arrival`).toBeGreaterThan(40);
    expect(rest!.badgeCount, `${name}: a chevron is drawn while the masthead is showing`).toBe(0);
    expect(rest!.actionable, `${name}: the chrome carries ${rest!.actionable} control(s) before Hide; it should carry Hide alone`).toBe(1);

    await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      (g.querySelector(".wpg-mast-hide") as HTMLElement).click();
    }, cls);
    await page.waitForTimeout(600);
    const folded = await read(page, cls);

    lines.push(
      `\n══ ${name}`,
      `   rest   masthead ${rest!.mastH} · badges ${rest!.badgeCount} · chrome controls ${rest!.actionable}`,
      `   folded masthead ${folded!.mastH} · slab line ${folded!.slabLine} · badge ${JSON.stringify(folded!.badge)} · straddle ${folded!.straddle} · inWindow ${folded!.inWindow} · inWrap ${folded!.inWrap}`,
    );

    expect(folded!.hidden, `${name}: Hide did not fold the masthead`).toBe(true);
    expect(folded!.mastH, `${name}: the masthead did not fold to nothing`).toBeLessThanOrEqual(1);
    /* ⚠️ THE HAIRLINE GOES WITH IT — a boundary with nothing above it marks the edge of nothing. */
    expect(folded!.slabLine, `${name}: the slab kept its hairline with the masthead folded away`).toContain("rgba(0, 0, 0, 0)");
    /* exactly one chevron, and it is the chrome's only control once the masthead is gone */
    expect(folded!.badgeCount, `${name}: ${folded!.badgeCount} chevrons rendered`).toBe(1);
    expect(folded!.actionable, `${name}: Hide is still rendered on a folded masthead`).toBe(0);
    /* ⚠️ A SIBLING OF THE WINDOW, NEVER A CHILD — the window clips at its radius. */
    expect(folded!.inWindow, `${name}: the chevron is INSIDE the window — it will be clipped by the radius`).toBe(false);
    expect(folded!.inWrap, `${name}: the chevron is not in the window's wrapper`).toBe(true);
    /* half in, half out: its centre sits on the window's top edge */
    expect(folded!.straddle, `${name}: the chevron's centre is ${folded!.straddle}px from the window's top edge, not on it`)
      .toBeCloseTo(0, 0);
    expect(folded!.badge!.w, `${name}: the badge is ${folded!.badge!.w}px wide`).toBeCloseTo(38, 0);
    expect(folded!.badge!.h, `${name}: the badge is ${folded!.badge!.h}px tall`).toBeCloseTo(20, 0);

    /* ══ THE BORDER RUNS UNINTERRUPTED, INCLUDING UNDER THE BADGE ══════════════════════════════ */
    const edge = await sampleTopEdge(page);
    expect(edge.samples.length, `${name}: the window's top edge is off screen (y ${edge.y} of ${edge.viewportH}) — nothing was sampled`)
      .toBeGreaterThan(30);
    const broken = edge.samples.filter((s) => !s.onWindow);
    expect(broken, `${name}: the window's top border is interrupted at x ${broken.map((b) => `${b.x} (${b.top})`).join(", ")} — something is cutting the line rather than resting on it`)
      .toEqual([]);
    /* ⚠️ AND THE LINE IS ONE ELEMENT SPANNING THE WHOLE WINDOW — the overlay at `inset: 0` with its
       inset shadow. A border assembled from segments, or shortened to make room for the badge, is
       the other way to break "one continuous line" and it would sample as clean above. */
    expect(edge.edgeInset, `${name}: the border overlay no longer spans the window (${edge.edgeInset})`).toBe("0px/0px");
    expect(edge.edgeShadow, `${name}: the border overlay stopped drawing the edge`).toContain("inset");

    /* the chevron brings it back */
    await page.evaluate(() => (document.querySelector(".wpg-chevfold") as HTMLElement).click());
    await page.waitForTimeout(600);
    const back = await read(page, cls);
    expect(back!.hidden, `${name}: the chevron did not restore the masthead`).toBe(false);
    expect(back!.mastH, `${name}: the restored masthead is not its resting height`).toBeCloseTo(rest!.mastH, 0);
    expect(back!.badgeCount, `${name}: the chevron survived the restore`).toBe(0);
    expect(back!.actionable, `${name}: Hide did not come back with the masthead`).toBe(1);
  }
  console.log(lines.join("\n"));
});

test("⚠️ A SCROLLING PAGE HAS NO FOLD AND NO CHEVRON — not hidden, not rendered", async ({ page }) => {
  /* A scrolling page's masthead leaves by scrolling, so a Hide there would be a second way to do
     what the page already does, and a chevron would be a control that stops meaning anything the
     moment you scroll past it. */
  for (const [name, route] of [["Contact list", "/agents"], ["Analytics", "/queries/analytics"]] as const) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    /* ⚠️ SCOPED TO THE DISPLAYED GRID. The workspace keeps every page MOUNTED and toggles
       `display`, so a document-wide count finds the fill pages' Hide buttons and reports them
       against whichever page happens to be on screen. The chevron is genuinely document-wide — it
       is portalled out of the grid — so it is counted that way deliberately. */
    const seen = await page.evaluate(() => {
      const g = [...document.querySelectorAll(".wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      return {
        hide: g.querySelectorAll(".wpg-mast-hide").length,
        chev: document.querySelectorAll(".wpg-chevfold").length,
      };
    });
    expect(seen.hide, `${name}: a scrolling page rendered Hide`).toBe(0);
    expect(seen.chev, `${name}: a scrolling page rendered a fold chevron`).toBe(0);
  }
});

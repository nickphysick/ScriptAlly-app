/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The page skeleton (audit pack P1; rebuilt v33 Phase 4) — what must stay true about it.
 *
 * ⚠️ THE ONE THING WORTH LOCKING IS THAT IT DOES NOT OWN A GRID. Everything else about a skeleton
 * is cosmetic and will be tuned; the property that makes it correct rather than decorative is that
 * its geometry is the PAGE's geometry, reused. A future pass that "tidies" the ghost into its own
 * `grid-template-columns` would look neater, pass every visual glance on the day, and drift
 * silently the first time a column moved — because nothing ever renders both at once to compare.
 *
 * ⚠️ AND v33 ADDS THE OTHER HALF OF THAT CLAIM, WHICH THIS FILE USED TO MISS ENTIRELY: reusing the
 * class NAMES is not reusing the STRUCTURE. The ghost wore `.os-colL` and `.os-colR` while the page
 * had gained an `.os-grid` between them and the hero, so the columns stacked — measured at 2520,
 * the activity ghost at x≈0 against a loaded column at x≈1860, and nothing in this file could see
 * it. The nesting is asserted as rendered markup now, and the boxes are checked by measurement
 * (`scripts/dash-skeleton-v33.mjs`, ≤8px against the loaded page at four widths).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { OneScreenSkeleton } from "./OneScreenSkeleton";

const css = readFileSync(join(__dirname, "oneScreen.css"), "utf8");
const dash = readFileSync(join(__dirname, "OneScreenDashboard.tsx"), "utf8");
const html = renderToStaticMarkup(<OneScreenSkeleton />);

describe("the page skeleton mirrors the page", () => {
  it("renders the REAL layout containers, not a private copy of the grid", () => {
    for (const cls of ["os-content", "os-grid", "os-greet", "os-colL", "os-toprow", "os-colR"]) {
      expect(html).toContain(cls);
    }
  });

  /* ⚠️ NESTING, NOT PRESENCE — the v33 fault passed the presence check above for three passes.
     Both halves are stated: the grid wraps the columns, and the hero is INSIDE the left column
     (it was a sibling of the grid, which started the whole grid 94px low and both columns with
     it). This is a claim about the file's own markup, so it belongs in a source lock; where the
     boxes actually LAND is a measurement and is made by the Phase 4 gate. */
  it("⚠️ the grid wraps the columns, and the hero is inside the LEFT one", () => {
    expect(html).toContain('<div class="os-grid" data-sk="grid"><div class="os-colL"><div class="os-greet">');
    const grid = html.indexOf('class="os-grid"');
    const colR = html.indexOf('class="os-colR"');
    expect(grid).toBeGreaterThan(-1);
    expect(colR).toBeGreaterThan(grid);
  });

  /* ⚠️ THE ANCHOR IS THE RULE, NOT THE NAME. Anchoring on `.os-skelpage` alone matched its FIRST
     mention — a cross-reference inside `.os-root`, 240 lines earlier — so the slice swallowed
     `.os-content`'s own grid and the test failed while the CSS was correct. Both halves are
     asserted before anything is read out of them.

     ⚠️ AND IT STRIPS COMMENTS FIRST, which it did not and should always have. This block's prose
     NAMES the declaration it forbids — "`.os-greet` is `grid-template-columns: auto minmax(0,1fr)`"
     is the reason the three hero ghosts are placed rather than auto-placed — so the moment the
     reasoning was written down the lock went red over a correct sheet. The house rule (CLAUDE.md,
     "A SOURCE-STRING LOCK STRIPS COMMENTS BEFORE IT ASSERTS") exists because this codebase
     documents every retirement by quoting what it retired. */
  it("⚠️ and declares no grid of its own — the columns are the page's, or they will drift", () => {
    const from = css.indexOf(".os-skelpage {");
    const to = css.indexOf("§11 · RESPONSIVE FRAME");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const sk = css.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, "");
    /* the slice must still hold the block it claims to be reading */
    expect(sk).toContain(".os-skelpage {");
    expect(sk).toContain(".os-sk-aut");
    expect(sk).not.toContain("grid-template-columns");
    expect(sk).not.toContain("column-gap");
  });

  /* ⚠️ THE GHOST CARDS ARE THE REAL CARDS. Each of these carries a box the page already declares —
     `.os-card` the paper, hairline, radius and shadow; `.os-aut` and `.os-lead` the top row's two
     shapes; `.os-ahead`/`.os-th2` the header bands' padding and floor; `.os-chartwrap` the
     `aspect-ratio: 1000 / 330` that IS the top row's height above 1710; `.os-actv` the hairline
     column that is deliberately not a card; `.os-comtile` the 132px tile. A ghost that restates
     any of them is a second source of truth for one box, and the drift is invisible. */
  it("⚠️ wears the page's own card classes — a restated box is a box free to drift", () => {
    for (const cls of ["os-card", "os-aut", "os-lead", "os-ahead", "os-lbody", "os-chartwrap",
                       "os-tasks", "os-th2", "os-actv", "os-comtile"]) {
      expect(html).toContain(cls);
    }
  });

  it("stands in for every card on the page — nothing loads unannounced", () => {
    /* the hero, the manuscript tile, the chart's plot, the to-do rule, the feed, the tile's mark */
    for (const cls of ["os-sk-h1", "os-sk-stats", "os-sk-aut", "os-sk-chplot", "os-sk-tkrule",
                       "os-sk-acbub", "os-sk-comill"]) {
      expect(html).toContain(cls);
    }
    /* ⚠️ A CARD THAT LEAVES THE PAGE LEAVES THE SKELETON IN THE SAME COMMIT, or the loading state
       advertises something that never arrives. Goals and the community CARD are both retired. */
    expect(html).not.toContain("os-sk-goal");
    expect(html).not.toContain("os-sk-counters");
    expect(html).not.toContain("os-sk-comstrip");
  });

  /* ⚠️ THE GATE'S FIVE HANDLES ARE INERT ATTRIBUTES, AND THEY EXIST OR THE GATE IS VACUOUS.
     `scripts/dash-skeleton-v33.mjs` reads exactly these; a renamed one used to fall back to the
     page's own `[data-probe]` UNDERNEATH the cover, which reported Δ 0 for a region nobody had
     looked at. The fallback is gone and this is the other half of that repair: the handles are
     asserted here, where a rename fails in the unit suite rather than in a browser. */
  it("⚠️ carries the gate's five handles — and they are attributes, not classes", () => {
    for (const h of ["grid", "toprow", "todo-card", "activity-card", "community-tile"]) {
      expect(html).toContain(`data-sk="${h}"`);
    }
    /* an unstyled class exists to be styled; a handle exists to be measured. Do not mix them. */
    expect(html).not.toContain("os-sk-tasks");
    expect(html).not.toContain("os-sk-actv");
  });

  /* ⚠️ THE GRID IS `.os-tkgrid` ITSELF, NEVER A COPY. A restated `repeat(auto-fill, minmax(288px,
     1fr))` shipped for one pass and had already drifted — the real grid steps to `minmax(240px,
     1fr)` below 1700 and the copy did not, so the ghost reflowed at a width the card does not. */
  it("the ticket grid is the loaded card's own class — it reflows where the real one reflows", () => {
    expect(html.match(/os-sk-ticket/g) ?? []).toHaveLength(8);
    expect(html).toContain('class="os-tkgrid"');
    expect(html).not.toContain("os-sk-tkgrid");
  });

  it("is hidden from assistive tech — a shape tells a screen reader nothing", () => {
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("the shimmer", () => {
  /* ⚠️ WHOLE-STRING MATCHES, NOT SLICES. The first draft of this test sliced from `indexOf("100%")`
     — which lands inside `translateX(-100%)` on the line ABOVE, because that string contains it.
     The slice then ended before the selector it meant to check and the assertion failed for a
     reason that had nothing to do with the CSS. See CLAUDE.md, "ANCHOR BEFORE YOU SLICE". */
  it("⚠️ keyframe selectors are LITERAL percentages — a var() there drops the block in silence", () => {
    expect(css).toMatch(
      /@keyframes os-sk-shimmer \{\s*0% \{ background-position: -600px 0; \}\s*100% \{ background-position: 600px 0; \}\s*\}/,
    );
  });

  /* ⚠️ THE MECHANISM IS THE REF'S NOW, AND THAT IS WHAT THIS ASSERTS (v33, Phase 4). The app swept
     a `::after` overlay by transform at 1.25s; the ref sweeps a 600px gradient by
     `background-position` at 1.4s. The change is not cosmetic: an animation declared on `::after`
     is INVISIBLE to `getComputedStyle(el)`, so the Phase 4 probe reported `animated: 0` about a
     shimmer that was running — and the ghosts now wear real card classes, where one `::after` in a
     card rule and the ghost's collide in silence. */
  it("⚠️ sweeps the ELEMENT's own background, never a pseudo-element", () => {
    const at = css.indexOf("  background-color: #ece6de;");
    expect(at).toBeGreaterThan(-1);
    const decl = css.slice(css.lastIndexOf(".os-sk {", at), css.indexOf("}", at));
    expect(decl).toContain("animation: os-sk-shimmer 1.4s linear infinite");
    expect(decl).toContain("background-size: 600px 100%");
    /* ⚠️ LONGHANDS. The `background` shorthand resets every longhand, so a mistyped gradient would
       leave the block TRANSPARENT rather than flat — the see-through family this repo records. */
    expect(decl).toContain("background-color: #ece6de");
    expect(decl).toContain("background-image: linear-gradient(90deg, #ece6de 0%, #f5f1ea 40%, #ece6de 80%)");
    expect(decl).not.toMatch(/\n\s+background: /);
    expect(css).not.toContain(".os-sk::after");
  });

  it("⚠️ reduced motion kills the animation NAME and the gradient with it", () => {
    // The sheet's blanket rule forces `animation-duration: .01ms !important` inside `.os-root`,
    // which would leave an infinite sweep strobing rather than stopped.
    expect(css).toContain("animation-name: none !important");
    // …and a stopped gradient sweep freezes mid-highlight, which reads as a rendering fault.
    expect(css).toContain(".os-sk { animation-name: none !important; background-image: none; background-color: #ece6de; }");
  });
});

/**
 * ⚠️ THE PAGE MUST NOT ARRIVE TWICE, AND THE COVER MUST BE THE ONLY SKELETON EVER SEEN.
 *
 * The dashboard has TWO skeleton systems: the per-card `.isload` bars (§8, instant, no timing
 * discipline) and the page cover. The reported blink survived three fixes because all three lived
 * in the cover's reveal — and the cover, behind its then-200ms delay, never mounted on a warm
 * Firestore load. What the user was watching was the OTHER system snapping to content in one
 * frame. The cover is now on from the FIRST PAINT (initialised state, not an effect), so the bars
 * are never seen and every load resolves the same way: hold, then dissolve.
 */
describe("the reveal — one arrival, not two", () => {
  it("⚠️ the entrance stagger is SKIPPED when the cover was shown", () => {
    expect(dash).toContain("if (skeleton.wasShown) return;");
    // …and the guard sits before the class is ever added
    const at = dash.indexOf("if (skeleton.wasShown) return;");
    const add = dash.indexOf('classList.add("enter")');
    expect(at).toBeGreaterThan(-1);
    expect(add).toBeGreaterThan(at);
  });

  it("⚠️ …and NOT deleted — a mount that BEGINS loaded shows no cover, and then it is the arrival", () => {
    expect(dash).toContain('classList.add("enter")');
    expect(dash).toContain('classList.remove("enter")');
  });

  it("⚠️ the cover dissolves rather than vanishing — mounted through its fade", () => {
    expect(dash).toContain('skeleton.phase !== "off" && <OneScreenSkeleton leaving={skeleton.phase === "out"} />');
    const at = css.indexOf(".os-skelpage {");
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at))).toContain("transition: opacity 250ms ease");
    expect(css).toContain(".os-skelpage.out { opacity: 0; pointer-events: none; }");
  });

  /* ⚠️ THE HOOK IS READ ABOVE THE EFFECT THAT USES IT. A `const` referenced before its declaration
     sits in the temporal dead zone and throws on the render that reaches it — the failure this
     repo has already shipped once, on a page carrying a warning against exactly it. */
  it("⚠️ useSkeleton is declared BEFORE the entrance effect reads it", () => {
    const decl = dash.indexOf("const skeleton = useSkeleton(loading)");
    const read = dash.indexOf("if (skeleton.wasShown) return;");
    expect(decl).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(decl);
  });
});

describe("the timing is the lib's, not the component's", () => {
  it("the dashboard renders the skeleton off useSkeleton — never off `loading` directly", () => {
    expect(dash).toContain("const skeleton = useSkeleton(loading)");
    expect(dash).not.toContain("loading && <OneScreenSkeleton");
  });

  /* ⚠️ ONE STATED HEIGHT LEFT, AND THE RETIREMENT OF THE OTHER THREE IS THE CLAIM.
     `--os-sk-counters-h`, `--os-sk-goal-h` and `--os-sk-tasks-h` each described a bare grey
     rectangle standing in for a card. The ghosts wear the real card classes now, so their boxes
     come from the same flex budgets and the same `aspect-ratio` that size the loaded ones, and a
     stated height would be a second source of truth free to drift. What cannot be derived is the
     manuscript tile's own content height — measured 312.3 at all four widths, and the taller card
     in the top row at 1536 and 1710, so it is what the row's height IS there. */
  it("the one content-driven height is declared once, as a token — and the other three are gone", () => {
    expect(css).toContain("--os-sk-aut-h:");
    expect(css).toContain("var(--os-sk-aut-h)");
    for (const t of ["--os-sk-counters-h", "--os-sk-goal-h", "--os-sk-tasks-h"]) {
      expect(css).not.toContain(t);
    }
  });
});

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
/* the loading state is ONE mechanism across three files, so it is locked in one place */
const shell = readFileSync(join(__dirname, "..", "shell", "WorkspaceShell.tsx"), "utf8");
const shellCss = readFileSync(join(__dirname, "..", "shell", "workspaceShell.css"), "utf8");
const rootCss = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8");
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
     1fr)` below 1700 and the copy did not, so the ghost reflowed at a width the card does not.
     ⚠️ AND FROM v34 IT IS IN THE CARD'S SCROLLER TOO. `auto-fill` resolves against the CONTAINER'S
     width, so wearing the right grid class is not enough on its own: the real grid sits inside
     `.os-tbody` (`padding: 6px 18px 10px`), and without those two insets the ghost's grid was 36px
     wider and resolved FOUR columns at 1920 and SIX at 2520 against the card's THREE and FIVE. */
  it("the ticket grid is the loaded card's own class, in the loaded card's own scroller", () => {
    expect(html).toContain('class="os-tkgrid"');
    expect(html).not.toContain("os-sk-tkgrid");
    expect(html).toContain('class="os-tbodywrap"');
    expect(html).toContain('class="os-tbody"');
  });

  /**
   * ⚠️ THE COUNT IS NOT IN THIS FILE, AND THAT IS THE CLAIM (v34, Phase 3). It was
   * `[0,1,2,3,4,5,6,7]` — eight at every width, against a card that shows 15 / 15 / 12 / 10 — and
   * the honest replacement is a measurement of the container, which no source lock can see. So the
   * unit claim is the NEGATIVE one that keeps it honest: nothing here decides how many.
   *
   * ⚠️ THE RENDERED COUNT IS ONE, AND THAT IS LOAD-BEARING RATHER THAN INCIDENTAL. This repo's
   * specs are `environment: node` + `renderToStaticMarkup`: there is no layout, so the effect that
   * counts never runs and what is asserted here is the FIRST PASS. That single block is the probe
   * the layout effect measures the tile height from — the alternative was a number typed into the
   * component, which is the drift this file already caught once at 82px against a real 75.8.
   *
   * The count itself is claimed where it can be: `scripts/dash-skeleton-v33.mjs`, against the
   * loaded card's own whole-visible count, at four widths, proved red on both the old eight and
   * the old tile height.
   */
  it("⚠️ no count lives in this file — the first pass renders exactly one block to measure", () => {
    expect(html.match(/os-sk-ticket/g) ?? []).toHaveLength(1);
    const src = readFileSync(join(__dirname, "OneScreenSkeleton.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/\[\s*0\s*,\s*1\s*,\s*2\s*,/);
    expect(src).toContain("getBoundingClientRect().height");
    expect(src).toContain("gridTemplateColumns");
  });

  it("is hidden from assistive tech — a shape tells a screen reader nothing", () => {
    expect(html).toContain('aria-hidden="true"');
  });

  /**
   * ⚠️ THE GHOST TAKES THE FLOW; THE PAGE STANDS DOWN (v33.2, Phase 4) — and this REVERSES v33.1's
   * overlay, so the reasoning is stated rather than left as a silent edit. The overlay's argument
   * was that the real cards must stay mounted for the reveal's stagger to find them; `display:
   * none` keeps them mounted, so nothing is lost. What the overlay could never do is cover the NAV
   * ROW, which is the shell's element and outside this page's tree — so the loading state was a
   * live header above a ghost body, which is what the phase retires.
   */
  it("⚠️ takes the flow rather than covering the page, and the page stands down", () => {
    const at = css.indexOf(".os-skelpage {");
    expect(at).toBeGreaterThan(-1);
    const decl = css.slice(at, css.indexOf("}", at));
    expect(decl).toContain("position: static");
    expect(decl).toContain("flex: 1 1 auto");
    expect(decl).not.toContain("inset: 0");
    expect(css).toContain(".os-root.os-loading > .os-content { display: none; }");
    /* the class is the COVER's phase, not the raw flag: the page must be back before the fade */
    expect(dash).toContain('skeleton.phase === "on" ? " os-loading" : ""');
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
    const at = css.indexOf("  background-color: var(--sa-sk-base);");
    expect(at).toBeGreaterThan(-1);
    const decl = css.slice(css.lastIndexOf(".os-sk {", at), css.indexOf("}", at));
    expect(decl).toContain("animation: os-sk-shimmer 1.4s linear infinite");
    expect(decl).toContain("background-size: 600px 100%");
    /* ⚠️ LONGHANDS. The `background` shorthand resets every longhand, so a mistyped gradient would
       leave the block TRANSPARENT rather than flat — the see-through family this repo records. */
    expect(decl).toContain("background-color: var(--sa-sk-base)");
    expect(decl).toContain("background-image: var(--sa-sk-sheen)");
    expect(decl).not.toMatch(/\n\s+background: /);
    expect(css).not.toContain(".os-sk::after");
  });

  it("⚠️ reduced motion kills the animation NAME and the gradient with it", () => {
    // The sheet's blanket rule forces `animation-duration: .01ms !important` inside `.os-root`,
    // which would leave an infinite sweep strobing rather than stopped.
    expect(css).toContain("animation-name: none !important");
    // …and a stopped gradient sweep freezes mid-highlight, which reads as a rendering fault.
    expect(css).toContain(".os-sk { animation-name: none !important; background-image: none; background-color: var(--sa-sk-base); }");
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
    /* ⚠️ AND IT LEAVES THE FLOW TO DO IT (v33.2). The ghost is in the flow while it holds — that
       is what makes its containers the page's own — so a fade alone would keep its box and push
       the arriving page BELOW it for the 250ms of the dissolve. */
    expect(css).toContain(".os-skelpage.out { opacity: 0; pointer-events: none; position: absolute; inset: 0; }");
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

/**
 * ⚠️ THE NAV ROW IS PART OF THE LOADING STATE (v33.2, Phase 4), AND IT IS THE SHELL'S ELEMENT.
 *
 * A page-owned skeleton can only ever cover the body, so the dashboard used to load with a live
 * header above a ghost page — a search field and two buttons that answered nothing, over a page
 * that plainly had no data. The row is `.ws-pagebar`, a child of `.ws-main`; the shell derives the
 * loading state from the same `collectionsReady` the page derives it from, rather than being told.
 */
describe("the nav row loads with the page", () => {
  it("⚠️ the shell READS the flag rather than being handed it", () => {
    expect(shell).toContain("collectionsReady");
    expect(shell).toContain("const dashLoading = dashMode && !collectionsReady;");
    /* published beside the other modes, on the same element, by the same expression shape */
    expect(shell).toContain('${dashLoading ? " dash-loading" : ""}');
  });

  it("⚠️ the row is a shape while it loads, and says so", () => {
    expect(shell).toContain('data-probe="navrow" aria-hidden={dashLoading || undefined}');
    expect(shellCss).toContain(".dash-loading .ws-pagebar { pointer-events: none; }");
  });

  /* ⚠️ THE PLACEHOLDERS ARE THE REAL CONTROLS, INK HIDDEN — which is why the row's geometry is the
     live one. Ghost blocks would restate six widths, one of which (the search) is a flex remainder
     that does not exist as a number to copy. */
  it("⚠️ hides the CHILDREN, paints the parents, and kills the bare text nodes", () => {
    expect(shellCss).toMatch(/\.dash-loading \.ws-pagebar \.ws-bigsearch > \*/);
    expect(shellCss).toMatch(/\.dash-loading \.ws-pagebar \.ws-nbtn > \*/);
    expect(shellCss).toContain("{ visibility: hidden; }");
    /* `New` is a bare text node beside its icon, so `> *` cannot reach it */
    expect(shellCss).toContain("color: transparent;");
  });

  /**
   * ⚠️ ONE SHIMMER, TWO SHEETS, ONE PAIR OF TOKENS. The page's ghosts are painted by
   * `oneScreen.css` and the row's by `workspaceShell.css`; a second literal gradient would drift a
   * quarter-tone from the body beneath it and nothing grepping either sheet alone would find the
   * pair. Both halves are asserted, because a token with one consumer is the state it replaced.
   */
  it("⚠️ the shimmer is one token pair, read by both sheets", () => {
    expect(rootCss).toContain("--sa-sk-base: #ece6de;");
    expect(rootCss).toContain("--sa-sk-sheen: linear-gradient(90deg, #ece6de 0%, #f5f1ea 40%, #ece6de 80%);");
    expect(css).toContain("var(--sa-sk-sheen)");
    expect(shellCss).toContain("var(--sa-sk-sheen)");
    /* and the animation is the same one, by name */
    expect(shellCss).toContain("animation: os-sk-shimmer 1.4s linear infinite");
  });

  it("⚠️ reduced motion reaches the row too, not only the page", () => {
    const at = shellCss.indexOf("@media (prefers-reduced-motion: reduce) {", shellCss.indexOf(".dash-loading .ws-pagebar"));
    expect(at).toBeGreaterThan(-1);
    const block = shellCss.slice(at, shellCss.indexOf("\n}", at));
    expect(block).toContain("animation-name: none !important");
    expect(block).toContain("background-image: none");
  });
});

/**
 * ⚠️ THE SIDEBAR BOUNDARY IS THE RAIL'S SHADOW, AND THE ELEMENT IS THE CLAIM (v33.2, Phase 3).
 *
 * v33.1 put it on `.ws-window`, whose left edge is 22px inside the column — so it read as the
 * page's own edge treatment, i.e. the page as the raised object resting on the rail. `.ws-main` is
 * the rail's flex sibling and starts exactly where the rail ends.
 */
describe("the sidebar boundary", () => {
  it("⚠️ is on the column that is flush with the rail, not on the window", () => {
    expect(shellCss).toContain(".dash-mode .ws-main::before {");
    expect(shellCss).toContain(".dash-mode .ws-main { position: relative; }");
    /* ⚠️ THE WINDOW'S COPY IS GONE FROM BOTH SHEETS, AND BOTH READS STRIP COMMENTS FIRST — this
       repo documents every retirement by quoting what it retired, so the prose explaining the move
       names the very selector the lock forbids. It went red on a correct sheet once already. */
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(strip(shellCss)).not.toContain(".ws-window::before");
    expect(strip(css)).not.toContain(".ws-window::before");
  });

  it("⚠️ 18px, three stops, inert, and below every card", () => {
    const at = shellCss.indexOf(".dash-mode .ws-main::before {");
    const decl = shellCss.slice(at, shellCss.indexOf("\n}", at));
    expect(decl).toContain("left: 0;");
    expect(decl).toContain("width: 18px;");
    expect(decl).toContain("rgba(42, 31, 24, 0.07)");
    expect(decl).toContain("rgba(42, 31, 24, 0.028) 45%");
    expect(decl).toContain("rgba(42, 31, 24, 0)");
    expect(decl).toContain("pointer-events: none;");
    /* ⚠️ 0, NOT THE PACK'S 2 — `.os-card` here is `z-index: 1`, so 2 would put the scrim ABOVE
       every card, which is the opposite of what the same sentence asks for. */
    expect(decl).toContain("z-index: 0;");
    expect(decl).not.toContain("100vh");
  });
});

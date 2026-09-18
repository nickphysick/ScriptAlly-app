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
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { describe, expect, it } from "vitest";
import { OneScreenSkeleton } from "./OneScreenSkeleton";
import { OneScreenHeader } from "./OneScreenHeader";
import { SKELETON_FADE_MS } from "../../lib/skeletonTiming";
import { sliceBetween } from "../../test/sliceBetween";
import { cssRules } from "../../test/cssRule";

const css = readFileSync(join(__dirname, "oneScreen.css"), "utf8");
const dash = readFileSync(join(__dirname, "OneScreenDashboard.tsx"), "utf8");
/* the loading state is ONE mechanism across three files, so it is locked in one place */
const shell = readFileSync(join(__dirname, "..", "shell", "WorkspaceShell.tsx"), "utf8");
const shellCss = readFileSync(join(__dirname, "..", "shell", "workspaceShell.css"), "utf8");
const rootCss = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8");
/* ⚠️ ONE SLOT SINCE v16 — the breakdown is retired, so the cover's only borrowed component is the
   page's own header, in ghost mode: probes off, no figures yet. */
const html = renderToStaticMarkup(
  <OneScreenSkeleton header={<OneScreenHeader ghost firstName="Nick" line={null} />} />,
);

describe("the page skeleton mirrors the page", () => {
  it("renders the REAL layout containers, not a private copy of the grid", () => {
    for (const cls of ["os-content", "os-greet", "os-row1", "os-row2"]) {
      expect(html).toMatch(new RegExp(`class="${cls}[" ]`));
    }
    /* every grid the page has retired took its ghost with it, in the same commit */
    for (const gone of ["os-toprow", "os-bd", "os-grid", "os-colL", "os-colR", "os-midrow"]) {
      expect(html, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
    }
  });

  /* ⚠️ NESTING, NOT PRESENCE — the v33 fault passed the presence check above for three passes.
     Both halves are stated: the grid wraps the columns, and the hero is INSIDE the left column
     (it was a sibling of the grid, which started the whole grid 94px low and both columns with
     it). This is a claim about the file's own markup, so it belongs in a source lock; where the
     boxes actually LAND is a measurement and is made by the Phase 4 gate. */
  /* ⚠️ RETARGETED (v16, 18 Sep): three rows in one centred block — the header, the three-card row,
     and the two-card row — and the cover is the same three, in the same order. The NESTING half of
     this claim is what the v33 fault slipped past for three passes (the ghost wore the right class
     names inside the wrong parent), so each card is asserted INSIDE its row rather than merely
     present somewhere in the document. */
  it("⚠️ three rows in the page's order, each card inside its own row", () => {
    const at = (needle: string) => {
      const i = html.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('<div class="os-greet">'),
      at('<div class="os-row1" data-sk="row1">'),
      at('<div class="os-row2" data-sk="row2">'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const row1 = sliceBetween(html, '<div class="os-row1" data-sk="row1">', '<div class="os-row2"', "the cover's row 1");
    for (const sk of ["quick-actions", "chart-card", "closed-tile"]) {
      expect(row1, `${sk} must be inside row 1`).toContain(`data-sk="${sk}"`);
    }
    const row2 = html.slice(order[2]);
    for (const sk of ["activity-card", "todo-card"]) {
      expect(row2, `${sk} must be inside row 2`).toContain(`data-sk="${sk}"`);
    }
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
    /**
     * ⚠️ THE SUBJECT, NOT A SLICE OF THE FILE. This read a region bounded by two comments, and v16
     * deleted the end anchor with the section it named: `indexOf` returned -1, and `slice(from, -1)`
     * reads to one character from the end of the file, so every assertion below it would have
     * covered the whole sheet in silence. It failed loudly only because both anchors were asserted.
     * The honest form is to collect the ghost's OWN rules — every selector naming `os-sk` — which
     * cannot be widened by a comment moving, and cannot be narrowed by the section being split in
     * two (the shapes live in §10 and the cover in §12, which is precisely what broke the slice).
     */
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const ghost = cssRules(bare).filter((r) => /\.os-sk/.test(r.sel));
    /* the population first: an empty set satisfies every claim below it */
    expect(ghost.length, "no ghost rules were read at all").toBeGreaterThan(8);
    expect(ghost.some((r) => r.sel.includes(".os-skelpage"))).toBe(true);
    expect(ghost.some((r) => r.sel.includes(".os-sk-hero"))).toBe(true);
    expect(ghost.some((r) => r.sel.includes(".os-sk-clrowlab"))).toBe(true);
    for (const r of ghost) {
      expect(r.body, `${r.sel} declares a grid of its own`).not.toContain("grid-template-columns");
      expect(r.body, `${r.sel} declares a column gap of its own`).not.toContain("column-gap");
    }
  });

  /* ⚠️ THE GHOST CARDS ARE THE REAL CARDS. Each of these carries a box the page already declares —
     `.os-card` the paper, hairline, radius and shadow; `.os-aut` and `.os-lead` the top row's two
     shapes; `.os-ahead`/`.os-th2` the header bands' padding and floor; `.os-chartwrap` the
     `aspect-ratio: 1000 / 330` that IS the top row's height above 1710; `.os-actv` the hairline
     column that is deliberately not a card; `.os-comtile` the 132px tile. A ghost that restates
     any of them is a second source of truth for one box, and the drift is invisible. */
  /* ⚠️ RETARGETED (v16): the five cards' own boxes — the card paper itself, the quick-action stack,
     the chart's mount frame and its three bands, the closed tile's ring and key, and the two
     scrolling cards. Every one of those is sized by a rule the page already declares. */
  it("⚠️ wears the page's own card classes — a restated box is a box free to drift", () => {
    /* ⚠️ RETARGETED (v33): the rim, the frame and the band are the page's own three boxes now, and the
       ghost wears all three on every card — with the band's TONE, so the cover is bands and plain
       blocks (Nick) and the band a card arrives with is the band it was waiting under. */
    for (const cls of ["os-card", "os-frame", "os-band", "os-bandrow", "os-qa", "os-qaminor", "os-qarow", "os-lead",
                       "os-acplot", "os-acdraw", "os-acx", "os-cl", "os-clpie", "os-ringbox", "os-clkey", "os-clrow",
                       "os-feed", "os-todo", "os-scroll", "os-tdfoot",
                       "os-tone--sand", "os-tone--navy", "os-tone--stone", "os-tone--slate", "os-tone--rose"]) {
      expect(html, cls).toMatch(new RegExp(`class="([^"]* )?${cls}[" ]`));
    }
    /* every retired row's boxes went with it — bands, mounts, columns and the old chart wrapper */
    for (const gone of ["os-aut", "os-lbody", "os-chartwrap", "os-ahead", "os-th2", "os-bdgrid", "os-mount",
                        "os-tasks", "os-actv", "os-comtile", "os-hd", "os-qastack", "os-acframe", "os-achead",
                        "os-acid", "os-aclegend", "os-acbody"]) {
      expect(html, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
    }
  });

  it("stands in for every card on the page — nothing loads unannounced", () => {
    /* each card's title and chip, the three action tiles, the chart's headline / legend / plot, the
       closed ring and its key rows, the feed's days and entries, the to-do rows and their footer */
    for (const cls of ["os-sk-ttl", "os-sk-mini", "os-sk-eyebrow", "os-sk-hero", "os-sk-qarowlab", "os-sk-acplot",
                       "os-sk-acx", "os-sk-donut", "os-sk-chip", "os-sk-clrowlab", "os-sk-fday", "os-sk-fent",
                       "os-sk-tdrow", "os-sk-tdfoot"]) {
      expect(html, cls).toContain(cls);
    }
    /* ⚠️ NO ILLUSTRATION IN THE COVER (v33, Nick). A Mentor arriving before his chart would be the one
       finished thing on an unfinished page — so the cover names no picture at all. */
    expect(html).not.toContain("<img");
    expect(html).not.toContain("/images/dash/");
    /* ⚠️ A CARD THAT LEAVES THE PAGE LEAVES THE SKELETON IN THE SAME COMMIT, or the loading state
       advertises something that never arrives. The breakdown, the goals card, the manuscript tile,
       the stat row, the community tile and the old chart are all retired — and the ghost's rules go
       with the ghost, so a dead `.os-sk-*` rule cannot sit in the sheet waiting to be reattached. */
    for (const gone of ["os-sk-bdn", "os-sk-bdpill", "os-sk-bdfact", "os-sk-bdfoot", "os-sk-qahero", "os-sk-qatile",
                        "os-sk-acstat", "os-sk-legend", "os-sk-ttl2", "os-sk-clrow",
                        "os-sk-qaitem", "os-sk-acart", "os-sk-actog", "os-sk-tkrule", "os-sk-acbub",
                        "os-sk-comill", "os-sk-aut", "os-sk-chplot", "os-sk-chbrush", "os-sk-chchips",
                        "os-sk-row", "os-sk-goal", "os-sk-counters", "os-sk-comstrip", "os-sk-ticket"]) {
      expect(html, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
      expect(css, gone).not.toMatch(new RegExp(`\\.${gone}[\\s{]`));
    }
  });

  /* ⚠️ THE GATE'S FIVE HANDLES ARE INERT ATTRIBUTES, AND THEY EXIST OR THE GATE IS VACUOUS.
     `scripts/dash-skeleton-v33.mjs` reads exactly these; a renamed one used to fall back to the
     page's own `[data-probe]` UNDERNEATH the cover, which reported Δ 0 for a region nobody had
     looked at. The fallback is gone and this is the other half of that repair: the handles are
     asserted here, where a rename fails in the unit suite rather than in a browser. */
  /* ⚠️ RETARGETED (stages 2–3): nine handles, and read OFF THE GATE rather than typed here twice — the
     list below is the gate's own `REGIONS`, minus the two shell regions it reads live in both states. */
  it("⚠️ carries every handle the gate reads — and they are attributes, not classes", () => {
    const gate = readFileSync(join(__dirname, "..", "..", "..", "scripts", "dash-skeleton-v33.mjs"), "utf8");
    const listed = sliceBetween(gate, "const REGIONS = [", "];", "the gate's region list");
    const regions = [...listed.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
    const ghosts = regions.filter((r) => r !== "navrow" && r !== "search");
    expect(ghosts, "the gate must read the ghost's regions").toHaveLength(7);
    for (const h of ghosts) {
      expect(html, h).toContain(`data-sk="${h}"`);
    }
    for (const gone of ["toprow", "breakdown", "grid", "community-tile"]) {
      expect(html, gone).not.toContain(`data-sk="${gone}"`);
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
  /* ⚠️ RETARGETED (v16): the ticket GRID is retired with the card that drew it — the to-do card is a
     list of rows in a plain scroller now. What survives is the claim underneath it, which is why this
     case is inverted rather than deleted: the ghost's rows sit in the loaded card's own scroller
     (`.os-scroll`), so their width, insets and count come from the box the page declares. The v34
     fault this guards against was `auto-fill` resolving against a ghost container 36px wider than the
     real one — four columns at 1920 against the card's three. */
  it("the ghost rows sit in the loaded card's own scroller, not a copy of it", () => {
    expect(html).toContain('<div class="os-scroll" data-sk="todo-rows">');
    for (const gone of ["os-tkgrid", "os-sk-tkgrid", "os-tbodywrap", "os-tbody"]) {
      expect(html, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
    }
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
    expect(html.match(/os-sk-tdrow/g) ?? []).toHaveLength(1);
    const src = readFileSync(join(__dirname, "OneScreenSkeleton.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/\[\s*0\s*,\s*1\s*,\s*2\s*,/);
    expect(src).toContain("getBoundingClientRect().height");
    /* the port's own box, which cannot loop: the scroller's height is the card's, not its contents' */
    expect(src).toContain("port.clientHeight");
  });

  /**
   * ⚠️ THE COVER'S HEADER IS THE PAGE'S HEADER, NOT A DRAWING OF IT (dashboard header, stage 1).
   * The brief is that the header never shows a skeleton: while data is out it says its words without
   * figures. Rendering the page's own component is also what keeps the cover's first row the page's
   * height to the pixel, which a hand-sized ghost was measured and tuned to do — and drifted from.
   * Its probes are off, because the page beneath the cover is mounted and carries its own.
   */
  it("⚠️ holds the page's own header — words, no figures, no shimmer, no probes", () => {
    const hdr = sliceBetween(html, '<div class="os-greet">', '<div class="os-row1"', "the cover's header");
    expect(hdr, "the header must be in the cover, before the first row").toContain("os-hello");
    expect(hdr).toContain("Hello, Nick.");
    expect(hdr).toContain('class="os-hdcounts"');
    expect(hdr).toContain("queries out");
    expect(hdr).toContain("waiting on you");
    expect(hdr, "no figure while the data is out — never a zero").not.toContain("<b>");
    expect(hdr, "no shimmer inside the header").not.toContain("os-sk");
    expect(hdr, "no probe on the cover's copy").not.toContain("data-probe");
    /* the retired ghosts went with the greeting and stat rows they stood for */
    for (const gone of ["os-sk-h1", "os-sk-sub", "os-sk-stats", "os-sk-stat", "os-sk-ill"]) {
      expect(html).not.toMatch(new RegExp(`["\\s\`]${gone}["\\s\`]`));
    }
  });

  /* ⚠️ THE COVER'S BREAKDOWN CASE IS RETIRED WITH THE SECTION (v16) — "Where your queries stand" is
     gone from the page, so the cover has one borrowed component rather than two. The claim it made
     (a ghost section states its heading's words and shimmers every figure) is carried by the header
     case above, which is the only borrowed component left. */

  it("is hidden from assistive tech — a shape tells a screen reader nothing", () => {
    expect(html).toContain('aria-hidden="true"');
  });

  /* ⚠️ AND INERT, because the cover is no longer only shapes: the header it carries can hold the
     tour button, and `aria-hidden` alone leaves a hidden control in the tab order. */
  it("⚠️ is inert — nothing inside the cover can take focus", () => {
    expect(html).toMatch(/<div class="os-skelpage" aria-hidden="true" inert="">/);
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
    /* the claim is the phase test and the leaving flag, not the spelling — the call now also
       hands the cover the page's header (stage 1), so it is matched across lines */
    expect(dash).toMatch(/skeleton\.phase !== "off" && \(\s*<OneScreenSkeleton\s+leaving=\{skeleton\.phase === "out"\}/);
    expect(dash).toMatch(/<OneScreenSkeleton[\s\S]{0,200}header=\{<OneScreenHeader ghost /);
    /* ⚠️ …and the cover's copy is handed NO figures, ever. `loading` drops before the board has
       finished deriving (measured: "2 tasks" for ~44ms before the true 23), and the page is stood
       down for exactly that window — only the cover could have shown the wrong number. */
    expect(dash).toMatch(/<OneScreenHeader ghost [^>]*line=\{null\}/);
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

  /* ⚠️ RETARGETED (stage 3): NO STATED HEIGHT LEFT. The manuscript tile's measured 312px went with the tile
     and its top row; every ghost box now comes from the page's own rules, and the ghosts' inner
     blocks are sized from the rules they stand for (see the note above `.os-sk-bdn`).
     ⚠️ THE ORIGINAL NOTE, FOR THE HISTORY: ONE STATED HEIGHT LEFT, AND THE RETIREMENT OF THE OTHER THREE IS THE CLAIM.
     `--os-sk-counters-h`, `--os-sk-goal-h` and `--os-sk-tasks-h` each described a bare grey
     rectangle standing in for a card. The ghosts wear the real card classes now, so their boxes
     come from the same flex budgets and the same `aspect-ratio` that size the loaded ones, and a
     stated height would be a second source of truth free to drift. What cannot be derived is the
     manuscript tile's own content height — measured 312.3 at all four widths, and the taller card
     in the top row at 1536 and 1710, so it is what the row's height IS there. */
  it("no content-driven height is stated for the cover any more — all four are gone", () => {
    const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const t of ["--os-sk-aut-h", "--os-sk-counters-h", "--os-sk-goal-h", "--os-sk-tasks-h"]) {
      expect(decls, t).not.toContain(t);
    }
  });

  /* ⚠️ THE COUNTED ROWS COUNT THE PAGE'S OWN LISTS (stages 2–3). Four action rows and four closed rows are
     fixed today; the cover reads the same two lists the cards draw, so neither can grow on the page and
     not in the cover. */
  it("⚠️ the action and closed-row ghosts are the cards' own lists, counted", () => {
    const src = readFileSync(join(__dirname, "OneScreenSkeleton.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ RETARGETED (v33): one tile and two rows — the rows are the registry's `minor` actions, counted,
       and the tile is the one `main`. Still the cards' own lists, never a number typed here. */
    expect(src).toContain('QUICK_ACTIONS.filter((a) => a.rank === "minor").map(');
    expect(src).toContain("CLOSED_BUCKETS.map(");
    expect(html.match(/os-sk-hero/g) ?? []).toHaveLength(QUICK_ACTIONS.filter((a) => a.rank === "main").length);
    expect(html.match(/os-sk-qarowlab/g) ?? []).toHaveLength(QUICK_ACTIONS.filter((a) => a.rank === "minor").length);
    expect(html.match(/os-sk-clrowlab/g) ?? []).toHaveLength(4);
  });
});

/**
 * ⚠️ THE NAV ROW IS PART OF THE LOADING STATE, AND IT LEAVES ON THE COVER'S CLOCK (v34).
 *
 * A page-owned skeleton can only ever cover the body, so the row — `.ws-pagebar`, the shell's
 * element — has to be put into the loading state from outside the page. v33 did that from the data
 * flag, which drops the moment data lands while the cover holds for its minimum, its settle beat
 * and its dissolve: measured, about half a second of live header above a covered body on every
 * warm load. These locks were retargeted rather than rebaselined, and the law they state is ONE
 * CLOCK: the shell computes no loading state, and the row reads the cover's own element through
 * `:has()`. The timing itself is measured every frame in `scripts/dash-skeleton-v33.mjs`
 * (`navInStep`), because no source lock can see a clock.
 */
describe("the nav row loads with the page", () => {
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const NAV_ON = ".dash-mode .ws-main:has(.os-skelpage:not(.out)) .ws-pagebar";
  const NAV_ANY = ".dash-mode .ws-main:has(.os-skelpage) .ws-pagebar";
  const NAV_OUT = ".dash-mode .ws-main:has(.os-skelpage.out) .ws-pagebar";
  const CONTROLS = ":is(.sb-toggle, .ws-bigsearch, .ws-fbpill, .ws-nbtn, .sp-help)";
  const ruleAt = (src: string, head: string) => {
    const at = src.indexOf(head);
    expect(at, `rule not found: ${head}`).toBeGreaterThan(-1);
    return src.slice(at, src.indexOf("}", at));
  };

  it("⚠️ the shell computes NO loading state — the data flag is not the cover's phase", () => {
    const code = strip(shell);
    expect(code).not.toContain("collectionsReady");
    expect(code).not.toContain("dashLoading");
    expect(code).not.toContain("dash-loading");
    expect(strip(shellCss)).not.toContain(".dash-loading");
  });

  it("⚠️ while the cover is up the row is a shape: inert, ink hidden, keyed to the cover's element", () => {
    const c = strip(shellCss);
    expect(c).toContain(`${NAV_ON} { pointer-events: none; }`);
    expect(c).toContain(`${NAV_ON} ${CONTROLS} > *`);
    /* `New` is a bare text node beside its icon, so `> *` cannot reach it */
    expect(ruleAt(c, `${NAV_ON} ${CONTROLS} {`)).toContain("color: transparent;");
  });

  /* ⚠️ A LAYER, BECAUSE A BACKGROUND CANNOT DISSOLVE — and it must exist while the cover is up, or
     `.out` has nothing to transition from and the row snaps while the body fades. */
  it("⚠️ the shimmer is a layer for the cover's whole life, and it dissolves on the cover's `.out`", () => {
    const c = strip(shellCss);
    const layer = ruleAt(c, `${NAV_ANY} ${CONTROLS}::after {`);
    expect(layer).toContain('content: "";');
    expect(layer).toContain("opacity: 1;");
    expect(layer).toContain("pointer-events: none;");
    /* the SAME number the hook unmounts the cover on — a different one leaves the top of the screen
       out of step with the body for the difference */
    expect(layer).toContain(`transition: opacity ${SKELETON_FADE_MS}ms ease`);
    expect(c).toContain(`${NAV_OUT} ${CONTROLS}::after { opacity: 0; }`);
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
    const c = strip(shellCss);
    const at = c.indexOf("@media (prefers-reduced-motion: reduce) {", c.indexOf(`${NAV_ANY} ${CONTROLS}::after {`));
    expect(at).toBeGreaterThan(-1);
    const block = c.slice(at, c.indexOf("\n}", at));
    expect(block).toContain(`${NAV_ANY} ${CONTROLS}::after`);
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

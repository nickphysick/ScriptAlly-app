/**
 * WorkspacePageGrid — the chrome-outside-the-scroller contract (amendment 9).
 *
 * ⚠️ THESE LOCK THE MECHANISM, NOT A MEASUREMENT. This repo's tests are `environment: 'node'` — no
 * jsdom, no layout, no IntersectionObserver — so "the chrome stays put" can only be asserted
 * structurally: the chrome rows are SIBLINGS of the scroll row, nothing is sticky, nothing takes a
 * `top`, and the plate learns it should condense from CONTEXT rather than by finding a scroller.
 *
 * ⚠️ THE PRIMITIVE IS INERT AT THIS COMMIT — nothing imports it. That is deliberate sequencing, and
 * the last assertion here pins it: a page converts per commit, and the old path stays alive until
 * the last one is off it, so any stop between commits leaves a working app.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { WorkspacePageGrid, PageTally } from "./WorkspacePageGrid";
import { PageHeader } from "./PageHeader";

const css = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");

/**
 * ⚠️ READ THE RULES, NOT THE PROSE — and this file learned it the hard way on its first run. Both
 * `position: sticky` and `querySelector` appear in the COMMENTS here, explaining what this design
 * deliberately does NOT do; asserting their absence against the raw text failed on the very
 * warnings that exist to prevent them. Every "must not contain" below reads a comment-stripped copy.
 */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const srcCode = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** ⚠️ EVERY block for a selector, joined — never the first. One rule per selector is the intent
 *  (the stylesheet says so), and this is what fails loudly if that ever stops being true. */
const block = (selector: string): string => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssRules))) {
    if (m[1].split(",").map((x) => x.trim()).includes(selector)) out.push(m[2]);
  }
  return out.join(" ");
};

/**
 * ⚠️ A REAL HEADER, NOT A STUB, AND THE GRID NOW INSISTS ON IT. The mini bar states the page's mark
 * and name and reads both off the `masthead` element it is handed — one source, rather than the same
 * two literals typed at every call site twice. So a `<span />` in that slot throws in development,
 * which is the guard working: it caught seven cases in this file the moment it landed.
 *
 * ⚠️ AND `plate` USED TO BE THE MARKER SOME OF THESE ASSERTED ORDER WITH. The title is the marker
 * now — it is text the header actually renders, rather than a word invented for a test.
 */
const MAST = <PageHeader variant="workspace" title="Test page" mark="todo" />;

describe("the grid — the scroller owns the page (in-flow masthead)", () => {
  it("⚠️ ONE SLAB, ONE STICKY, AND NO OFFSET ENCODES ANOTHER ELEMENT'S HEIGHT", () => {
    /**
     * ⚠️ THE RULE IS AMENDED FOR THE THIRD TIME AND HAS NEVER BEEN WEAKENED. What it forbids is a
     * sticky element whose `top` encodes ANOTHER element's height — `calc(56px + gap)`, silently
     * wrong by 32px on the Tasks family. It has been through: one sticky at `top: 0`; two stacked,
     * where the row's `top: var(--wpg-mini-h)` was allowed because the bar READ the same token for
     * its height, so the two could not drift.
     *
     * ⚠️ NOW THERE IS NOTHING TO CLEAR, WHICH IS THE STRONGEST FORM OF THE RULE (pinned chrome, §1).
     * The masthead and the control row are one SLAB, and the slab is the only sticky element in the
     * scroller — so every `top` is 0 again, not by agreement between two tokens but because there is
     * no second pinned thing for anything to sit beneath.
     */
    const stickyBlocks = [...cssRules.matchAll(/\{[^}]*position:\s*sticky[^}]*\}/g)].map((m) => m[0]);
    expect(stickyBlocks.length, "no sticky rules found — this case would be asserting nothing").toBeGreaterThan(0);
    /* ⚠️ EXTRACT THE VALUE, DO NOT LOOK AHEAD PAST IT. `not.toMatch(/top\s*:\s*(?!0)/)` flagged
       `top: 0` — `\s*` backtracks to zero width, so the lookahead tested the SPACE rather than the
       digit and every value passed. Read each declaration and compare it. */
    const tops = stickyBlocks.flatMap((b2) => [...b2.matchAll(/(?:^|[;{\s])top\s*:\s*([^;}]+)/gm)].map((m) => m[1].trim()));
    expect(tops.length, "no `top` is declared at all — the slab lost its anchor").toBeGreaterThan(0);
    /**
     * ⚠️ ONE `top` IS NOT 0, AND IT IS THE LEGITIMATE FORM OF THE RULE RATHER THAN AN EXCEPTION TO
     * IT. The two-view tab rail sits BENEATH the collapsed bar when the bar is showing, so its offset
     * genuinely is another element's height — and what this case forbids has always been encoding
     * that height as a NUMBER (`calc(56px + gap)`, silently wrong by 32px on the Tasks family). The
     * rail reads `var(--bar-h)`, the bar's own token, so the two cannot drift: change the bar's
     * height and the rail follows without anyone remembering.
     *
     * ⚠️ AND THE ALLOWANCE IS A PATTERN, NOT A LIST. Anything else is still 0, and a `top` carrying a
     * literal fails whatever declares it.
     */
    for (const t of tops) {
      expect(t, `a sticky element clears \`${t}\` — nothing above the scroller may be measured into a rule`).toBe("0");
    }
    /* ⚠️ THE TAB RAIL'S OFFSET ALLOWANCE IS DELETED WITH THE RAIL. It was the one legitimate
       non-zero `top` in this sheet — a rail sitting beneath the bar, reading the bar's own token
       rather than restating 46. The rail is gone, so every `top` is 0 again and the rule is back to
       its strongest form: nothing clears anything, because nothing needs to. */
    /**
     * ⚠️ TWO STICKY BOXES NOW, AND THE LAW IS UNCHANGED. The rebuild adds the collapsed bar, which
     * has to pin to be a bar at all. What the rule forbids is a `top` that encodes ANOTHER element's
     * height — and both are `top: 0`, asserted above, because the bar RESERVES NO SPACE: its
     * negative bottom margin is its own height, so the slab beneath it is at the same place whether
     * the bar is showing or not. Nothing clears anything.
     *
     * ⚠️ COUNTED AS A SET, so a third pinned element cannot arrive unnoticed — which is the half of
     * this case that still does the work.
     */
    /* ⚠️ THE SUBJECT OF THE SELECTOR, NOT ITS FIRST CLASS. My first version captured the first
       `.wpg-*` it saw and reported `.wpg-scroll` as sticky — the ANCESTOR in `.wpg-scroll >
       .wpg-chrome`, which is a scrollport and could not be. The assertion read as a real second
       sticky element and was an artefact of the regex. */
    const stickySubjects = [...cssRules.matchAll(/([^{}]+)\{[^}]*position:\s*sticky[^}]*\}/g)]
      .map((m) => m[1].trim().split(/[\s>]+/).filter(Boolean).pop()!);
    /* ⚠️ ONE STICKY AGAIN, AND IT IS THE BAR RATHER THAN THE SLAB. The slab pinned so the masthead
       could settle; the rebuild's masthead LEAVES, so the slab is static and the collapsed bar is the
       only pinned thing in the scroller. Same claim as before the settle existed, different subject —
       and a second pinned element still cannot arrive unnoticed. */
    expect([...new Set(stickySubjects)].sort(), `the set of sticky elements has changed: ${stickySubjects.join(", ")}`)
      .toEqual([".wpg-bar"]);
  });

  it("the scroll row is `minmax(0, 1fr)` — a plain `1fr` grows to its content and never scrolls", () => {
    /* ⚠️ TWO ROWS SINCE THE MASTHEAD MOVED INSIDE THE SCROLLER — the scroller, then the dock. */
    expect(block(".wpg"), "the grid lost its row template").toContain("grid-template-rows: minmax(0, 1fr) auto");
    expect(block(".wpg"), "the grid itself started scrolling — only row 3 may").toContain("overflow: hidden");
    expect(block(".wpg-scroll"), "the scroll row stopped scrolling").toContain("overflow-y: auto");
    expect(block(".wpg-scroll"), "`min-height: 0` went — the row will refuse to shrink below its content and push the frame open").toContain("min-height: 0");
  });

  it("⚠️ EVERY ROW IS PLACED EXPLICITLY — auto-placement would put the scroller in an `auto` track", () => {
    /* The original fault is unchanged in kind, only in arithmetic: an auto-placed scroller lands in
       a track that sizes to its content and therefore never scrolls. Two rows now — the scroller
       and the dock — because the masthead and the control row are children of the scroller. */
    expect(block(".wpg-scroll")).toContain("grid-row: 1");
    expect(block(".wpg-dock")).toContain("grid-row: 2");
    /* ⚠️ AND THE CONTROL ROW MUST NOT NAME ONE. It is in flow inside the scroller; a `grid-row`
       left on it would be inert today and actively wrong the moment anyone put it back in the grid
       without re-reading why it moved. */
    expect(block(".wpg-tools"), "the control row still claims a grid row — it is not a grid item any more")
      .not.toContain("grid-row");
  });

  it("⚠️ THE CONTROL ROW IS INVISIBLE AT REST — it is controls, not a second plate", () => {
    /**
     * ⚠️ THE ROW NO LONGER PAINTS ITS OWN GROUND, AND THAT IS THE POINT (pinned chrome, §1). It had
     * one because it was independently sticky and content would have passed through it. Inside the
     * slab the slab paints it — and two boxes painting one ground is how a seam appears the day one
     * of them is retinted, which is the fault `.wpg-hem` already taught this file with `#ffffff`.
     *
     * The rest of the claim is unchanged and still worth holding: controls, not a plate.
     */
    const t = block(".wpg-tools").replace(/\s+/g, " ");
    expect(t, "the control row paints its own ground again — the slab already paints it")
      .not.toMatch(/(^|[;\s])background\s*:/);
    expect(t, "the control row gained a full border").not.toMatch(/(^|[;\s])border\s*:/);
    expect(t, "the control row gained a radius — that is a card").not.toMatch(/(^|[;\s])border-radius\s*:/);
    expect(t, "the control row drew a hairline — the slab's base is the only line in the chrome")
      .not.toMatch(/(^|[;\s])border-bottom\s*:/);
    /* ⚠️ AND THE SLAB CARRIES THE ONE LINE. The SHADOW's half of this claim is withdrawn with the
       settle: it appeared only while the slab was pinned, and the slab does not pin — it scrolls
       away as content and the collapsed bar carries the shadow instead (see `.wpg-bar--on`). */
    const slab = block(".wpg-scroll > .wpg-chrome").replace(/\s+/g, " ");
    expect(slab, "the slab lost its base hairline").toMatch(/border-bottom:\s*1px solid var\(--ws-edge\)/);
    expect(slab, "the slab's ground is a literal — it will be wrong the next time the window is retoned")
      .toMatch(/background:\s*var\(--ws-window\)/);
    expect(cssRules, "the settle's posture class came back — one masthead, one posture")
      .not.toContain("wpg-chrome--stuck");
  });

  /**
   * ⚠️ THE EQUALITY ASSERTION IS WITHDRAWN. It required the header's edges to EQUAL the content's
   * — true while both read one cap, and false by design now: the header sits an inset further in.
   * Kept as a note because the old test would fail correctly and the failure would read as a
   * regression.
   *
   * ⚠️ AND WIDTHS ARE NO LONGER CAPS, SO THERE IS NO PIXEL TO ASSERT. Content is the window minus
   * a gutter, the header is that minus an inset, and the strip is the whole container. What has to
   * hold is the RELATIONSHIP, so this reads both tokens out of the stylesheet and computes the
   * edges at three window widths rather than naming a figure — a hardcoded number here would have
   * to be edited every time either token moved, which is how a lock stops describing the design.
   */
  it("⚠️ TWO MEASURES — the content takes its page's, the masthead takes one constant", () => {
    /* ⚠️ THIS REVERSES WHAT STOOD HERE, ON THE PACK'S TERMS. The old rule was a RELATIONSHIP:
       content = window − 2×gutter, header = content − 2×inset, so the plate sat `--header-inset`
       inside the cards it floated above. A plate was an object and an object needs a margin.

       The masthead is content. It is a child of the scroll row, so it takes the scroll row's gutter
       and states nothing of its own — which is what puts every page's mark on the same vertical as
       the content beneath it without either naming a number. The inset has no reader left. */
    const tokenCss = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
    const gutter = /:root\s*\{[^}]*--content-gutter:\s*(\d+)px/s.exec(tokenCss);
    expect(gutter, "the content gutter is not declared on :root — every width below is unresolvable").toBeTruthy();
    expect(Number(gutter![1]), "the gutter went to zero — content would touch the window edge").toBeGreaterThan(0);

    /**
     * ⚠️ THE GUTTER MOVED OFF THE SCROLL ROW AND ONTO THE MEASURES INSIDE IT (masthead
     * left-constant, §A). One padding here insets EVERY child equally, and the whole point of this
     * amendment is that the masthead and the content no longer share a gutter.
     *
     * ⚠️ AND THE SCROLLBAR RESERVATION IS GONE, WHICH INVERTS WHAT THIS ASSERTED. It required
     * `scrollbar-gutter: stable both-edges` — a reservation on BOTH sides, to keep the two gutters
     * equal and stop content jumping when a bar appeared. That reservation lies outside the
     * scroller's content box, so nothing painted by a child could reach into it, and it was the
     * third distinct cause of the masthead's wash stopping short of the window's edges.
     *
     * ⚠️ IT IS NOT REPLACED BY `stable`, and only measuring the platform shows why: the scrollbar
     * here is an OVERLAY. Measured on Manuscripts at 1280 — the row overflows by 72px and scrolls,
     * and `offsetWidth === clientWidth === 1010`. The bar takes no width at all, so a reserved
     * gutter is not "where the bar goes"; it is ground the band cannot reach, for a bar that never
     * occupies it. With overlay bars the jump this reservation guarded against cannot happen.
     *
     * ⚠️ THE TRADE IS NAMED RATHER THAN HIDDEN: on a machine set to ALWAYS SHOW SCROLLBARS the bar
     * is classic and takes ~15px, and there this omission does reintroduce the jump. That is Nick's
     * call, recorded in the run report; what this case now asserts is that NOTHING is reserved, so
     * the band's edges cannot be lost to a gutter again by accident.
     */
    expect(block(".wpg-scroll"), "the scroll row went back to padding every child by the same amount")
      .not.toContain("padding-inline:");
    /**
     * ⚠️ THE WASH IS DELETED, AND THE SWEEP THAT GUARDED IT GOES WITH IT. `--mast-wash-top` and
     * `--mast-wash-bottom` were the masthead's parchment band, swept over `src/` so no page could
     * spell either hex out — a second copy is how one surface gets left behind on an old colour
     * that still looks like a wash.
     *
     * ⚠️ TWO FINDINGS FROM THAT SWEEP ARE WORTH MORE THAN THE TOKENS AND ARE KEPT HERE. Strip
     * comments before sweeping, or a retirement note that NAMES the thing retired is reported as a
     * second copy of it — this lock broke that way on its second use. And the value must be read
     * from the token rather than restated in the assertion, or the lock is itself the second copy.
     */
    expect(cssRules, "the wash came back — one masthead format means one ground, the window's own")
      .not.toContain("--mast-wash");
    expect(block(".wpg-scroll"), "a scrollbar gutter is reserved again — that strip is outside the scroller's content box, so the masthead's wash cannot reach the window's edge through it")
      .not.toContain("scrollbar-gutter");
    /* comments stripped: this file's prose NAMES the retired token, so a bare search finds the
       explanation and calls it the code */
    const declsOnly = cssRules.replace(/\/\*[\s\S]*?\*\//g, "");
    /**
     * ⚠️ `--wpg-gutter` IS BACK AND `--masthead-inset` IS NOT, AND THE DIFFERENCE IS THE POINT. The
     * two were forbidden together while the masthead took the page's measure; what was wrong was
     * never the token's NAME but the MECHANISM it served — the masthead reading the page's gutter in
     * order to CANCEL it with a negative margin and reach a fixed inset from the window edge.
     * `--wpg-gutter` now names the page's own content gutter, is read only by content, and the
     * masthead has never heard of it.
     *
     * ⚠️ SO THE ASSERTION IS ABOUT THE MECHANISM, NOT THE VOCABULARY. A forbidden-name list would
     * have had to be relaxed here, and would then have been guarding nothing at all.
     */
    expect(declsOnly, "`--masthead-inset` came back — the masthead is measuring from the window again")
      .not.toContain("--masthead-inset");
    expect(declsOnly, "a negative inline margin came back — that is the escape the window-inset system used, and the fault was the escape rather than the token")
      .not.toMatch(/margin-inline:\s*calc\(\s*-/);
    /**
     * ⚠️ TWO MEASURES, AND THE MASTHEAD'S IS THE CONSTANT ONE (masthead left-constant, §A). This
     * asserted the masthead took the PAGE's measure — the second of three positions on masthead
     * width, and wrong: pages do not share a gutter, so the masthead's left edge moved between 35
     * and 80 as you changed page.
     *
     * Content keeps `--wpg-measure` and its page's gutter, expressed as a max-width REDUCTION rather
     * than as padding — padding here would land on the page's own first element and clobber the
     * inner padding of a drawn frame like Query Centre's.
     */
    expect(block(".wpg-scroll > *"), "the scroller's children stopped taking the page's measure")
      .toContain("max-width: min(var(--wpg-measure, 100%), calc(100% - 2 * var(--wpg-gutter, var(--content-gutter))))");
    /* ⚠️ AND THE PAGE'S GUTTER IS A FALLBACK, NOT A DEFAULT ON `.wpg`. A page's class sits on the
       SAME element as `.wpg`, so a default here is 0-1-0 against 0-1-0 and source order decides —
       this sheet is later, so it beat every override. Measured: Query Centre took the wide gutter. */
    expect(block(".wpg"), "the page gutter went back to being declared on the grid, where it outranks every page")
      .not.toContain("--wpg-gutter:");
    /* ⚠️ 0-2-0 ON PURPOSE — at equal specificity this would depend on source order, which is how a
       rule quietly stops applying the day someone reorders a file. */
    const mastMeasure = cssRules.slice(cssRules.indexOf(".wpg-scroll > .wpg-mast"));
    /* ⚠️ THE SAME EXPRESSION SHAPE AS THE CONTENT'S, deliberately — mixing a reduction with padding
       made the two diverge the moment the cap bound: measured, the masthead's ink sat 35px inside
       the panes it titles at 2300 while matching them exactly at 1440. One shape, both measures. */
    expect(mastMeasure, "the masthead stopped taking the shared cap and the one constant gutter")
      .toContain("max-width: min(var(--work-max), calc(100% - 2 * var(--mast-gutter)))");
    /* the cap is READ, never restated — `--work-max` is the app's shared centring measure and the
       content reads the same token through `--wpg-measure` */
    expect(mastMeasure, "the masthead restated the cap as a number instead of reading the shared token")
      .not.toMatch(/max-width:[^;]*\d{3,4}px/);
    expect(block(".wpg"), "the constant gutter is not defined on the grid").toContain("--mast-gutter: 35px");
    /* ⚠️ `width: 100%` IS PART OF THE CLAIM, NOT TIDINESS. Without it an auto inline margin stops a
       FLEX child stretching, so on the five fill pages the masthead and the content both shrank to
       their own contents — the fix breaking both sides of the comparison it exists to hold. */
    expect(block(".wpg-scroll > *"), "the measure lost its definite width — flex children would shrink instead of centring")
      .toContain("width: 100%");
    for (const sel of [".wpg-tools", ".wpg-scroll"]) {
      expect(block(sel), `${sel} took a max-width — widths are relationships, not caps`).not.toContain("max-width");
    }
    /* ⚠️ THE CONTROL ROW MUST NOT RE-GUTTER. It is inside the scroller, so a `padding-inline` here
       would inset it a second time and pull the page's controls off the vertical its cards sit on —
       the doubled-gutter fault, in the one row most likely to be measured against them. */
    /* ⚠️ THE BAND IS HELD TO THE SAME RULE AS THE ROW (header fix, §2). It is full-bleed by design —
       that is what lets it cover the masthead's wash edge to edge — so a horizontal inset on it
       would be a second gutter inside a box whose whole job is not to have one. */
    for (const sel of [".wpg-tools", ".wpg-toolband"]) {
      expect(block(sel), `${sel} re-states a horizontal inset it has already inherited`)
        .not.toContain("padding-inline");
    }
    /* the band paints the page's ground, and paints it as a COLOUR — a gradient here would be the
       masthead's wash reaching the toolbar, which §2 exists to prevent */
    expect(block(".wpg-toolband"), "the toolbar's band does not paint the page's ground")
      .toContain("background: var(--ws-window)");
    expect(block(".wpg-toolband"), "the toolbar's band paints a gradient — the wash has reached it")
      .not.toContain("gradient");
    const tools = block(".wpg-tools");
    const pad = /padding:\s*([^;]+);/.exec(tools);
    expect(pad, "the control row states no padding at all").toBeTruthy();
    /* ⚠️ EXTRACTED AND COMPARED, NEVER A `(?!…)` LOOKAHEAD — after optional whitespace a lookahead
       backtracks to zero width and tests against the SPACE, so `padding: 12px 80px` would pass a
       rule written to forbid it. */
    const sides = pad![1].trim().split(/\s+/);
    expect(sides.length, "the control row's padding names horizontal values — the scroller pays those").toBe(2);
    expect(sides[1], "the control row gained a horizontal inset").toBe("0");

    /* ⚠️ AND THE RETIRED TOKEN HAS NO READER. `--header-inset` survives its own declaration until
       step 4; what must be true now is that nothing consumes it, or the masthead is being inset
       away from the content again by a rule nobody remembers writing. */
    const gridCss = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
    const live = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [name, css] of [["the grid", gridCss], ["the header", tokenCss]] as const) {
      expect(live(css), `${name} still reads --header-inset — the masthead would sit inside the content again`)
        .not.toContain("var(--header-inset)");
    }
  });

  /**
   * ⚠️ THE WIDTH CHAIN, ASSERTED AS A RELATIONSHIP — because enumerating forbidden properties has
   * now been short TWICE.
   *
   * v1 forbade `--wpg-cap`, `--pg-gut` and `--sa-col-max` in the page stylesheets. It passed while
   * Submission packages carried 28px INLINE and three `@media` overrides re-guttered two roots.
   * v2 added side padding and the Packages markup. It passed while FOUR pages were capped by
   * `contentVariant` on the route SLOT — an ancestor, in App.tsx, that no page stylesheet mentions.
   * Measured at 2400px against the built stylesheet: Contact list 2400, Discover 1600, Manuscripts
   * 1200, Analytics 1140. Four regimes, six pages, two tokens, and a green lock.
   *
   * ⚠️ SO THIS ENUMERATES THE CHAIN, NOT THE PROPERTIES. Every element from the route slot down to
   * the content is walked, and each is required to introduce NO width of its own — a cap, a fixed
   * width, an auto margin or a side padding. The list that has to stay complete is the list of
   * ANCESTORS, which is fixed by the DOM, rather than the list of ways to be narrow, which is not.
   */
  it("⚠️ nothing between the window and the content states a width of its own", () => {
    const CHAIN: [string, string, string[]][] = [
      ["Contact list", "components/agents/agentList.css", [".aglist", ".aglist .agl-page", ".aglist .agl-inner", ".aglist .agl-wpg"]],
      ["Discover", "components/agents/discover.css", [".dv2", ".dv-wpg", ".dv-wrap"]],
      ["Manuscripts", "components/manuscripts/manuscripts.css", [".msv1", ".msv-wpg", ".msv-wrap"]],
      ["Comparable titles", "components/manuscripts/comps.css", [".ctpage", ".ct-wpg", ".ct-desk"]],
      ["Submission packages", "components/packages/packageWorkshop.css", [".pkgw", ".pkgw-wpg"]],
      ["Analytics", "components/shell/workspaceShell.css", [".qa-wrap"]],
    ];
      /* ⚠️ EXTRACT THE VALUE, NEVER LOOK AHEAD PAST IT — and this file already says so, about a
         different rule, after the same failure. `width\s*:\s*(?!100%)` MATCHES `width: 100%`,
         because `\s*` backtracks to zero width and the lookahead then tests the SPACE. Reading each
         declaration and comparing it says what is meant and cannot be defeated by backtracking. */
      const NARROWS = (decl: string, value: string): boolean => {
        const v = value.trim().replace(/\s*!important$/, "");
        if (decl === "max-width") return v !== "none";
        if (decl === "width") return !["100%", "auto", "0", "0px"].includes(v);
        if (decl === "margin" || decl === "margin-inline") return /\bauto\b/.test(v);
        return false;
      };
    for (const [page, file, selectors] of CHAIN) {
      const pageCss = readFileSync(resolve(__dirname, "../..", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const sel of selectors) {
        const blocks: string[] = [];
        for (let i = pageCss.indexOf(sel + " {"); i > -1; i = pageCss.indexOf(sel + " {", i + 1)) {
          blocks.push(pageCss.slice(i, pageCss.indexOf("}", i)));
        }
        for (const b of blocks) {
          for (const m of b.matchAll(/(^|[;{])\s*(max-width|width|margin|margin-inline)\s*:\s*([^;}]+)/g)) {
            expect(NARROWS(m[2], m[3]), `${page}: \`${sel}\` narrows the chain with \`${m[2]}: ${m[3].trim()}\` — every element between the window and the content must simply fill its parent`)
              .toBe(false);
          }
          for (const m of b.matchAll(/padding(-inline)?:\s*([^;]+)/g)) {
            const parts = m[2].trim().split(/\s+/);
            const sides = m[1] ? parts[0] : (parts.length === 1 ? parts[0] : parts[1]);
            expect(sides, `${page}: \`${sel}\` pads its sides (\`${m[0]}\`), insetting everything below it`).toMatch(/^0(px)?$/);
          }
        }
      }
    }
    /* the two ancestors that live OUTSIDE any page stylesheet, and each got through a lock once */
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    for (const route of ['routeKey === "agents"', 'routeKey === "manuscripts"', "active={queriesAnalytics}"]) {
      const at = app.indexOf(route);
      expect(at, `${route} is not mounted here any more`).toBeGreaterThan(-1);
      expect(app.slice(at, app.indexOf(">", at)), `${route}'s slot caps the page from an ancestor no page stylesheet can see`)
        .not.toContain("contentVariant");
    }
    const pkg = readFileSync(resolve(__dirname, "../SubmissionPackages.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rootStyle = /className="pkg-root pkgw" style=\{\{([^}]*)\}\}/.exec(pkg);
    expect(rootStyle, "the Packages root changed shape — this assertion no longer reads it").toBeTruthy();
    const pad = /padding:\s*"([^"]+)"/.exec(rootStyle![1]);
    expect(pad![1].trim().split(/\s+/)[1], `Packages pads its root's sides inline (\`${pad![1]}\`) — invisible to every stylesheet lock`).toMatch(/^0(px)?$/);
  });

  /* ⚠️ NO PAGE MAY RE-STATE A WIDTH. The caps lived on five page stylesheets and a per-page gutter
     on four of them; both are the grid's job now. A page that caps again puts the scrollbar back
     outside its content column, and does it on one page only — the hardest kind to notice. */
  it("⚠️ no converted page states a cap or a gutter of its own", () => {
    const PAGES: [string, string][] = [
      ["Contact list", "components/agents/agentList.css"],
      ["Manuscripts", "components/manuscripts/manuscripts.css"],
      ["Comparable titles", "components/manuscripts/comps.css"],
      ["Discover", "components/agents/discover.css"],
      ["Submission packages", "components/packages/packageWorkshop.css"],
      /* ⚠️ QUERY CENTRE JOINED THE CENSUS LAST, and it was the alias's only caller. */
      ["Query Centre", "components/shell/f12.css"],
    ];
    for (const [page, file] of PAGES) {
      const pageCss = readFileSync(resolve(__dirname, "../..", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(pageCss, `${page} still declares --wpg-cap — the cap token is retired`).not.toContain("--wpg-cap");
      expect(pageCss, `${page} still declares --pg-gut — the gutter is the grid's, declared once`).not.toContain("--pg-gut:");
      expect(pageCss, `${page} reads --sa-col-max, which no longer exists — its width resolves to nothing`).not.toContain("--sa-col-max");
      /* ⚠️ AND `--sa-col-gut`, WHICH WAS THE MORE DANGEROUS OF THE TWO. It resolved to
         `--content-gutter`, so a rule reading it looked like it was sharing the shared gutter —
         while in fact adding a second one on top of the scroll row's, which already pays it.
         Query Centre's working frame was 80px narrower a side than every other page's for that
         reason, through a `calc` that named the right token. A retired alias that still
         evaluates is worse than one that breaks: nothing goes wrong loudly. */
      expect(pageCss, `${page} reads --sa-col-gut — the alias is retired; the scroll row already pays the gutter`).not.toContain("--sa-col-gut");
    }
  });

  /* ══ §2 — THE GAP UNDER THE HAIRLINE ═════════════════════════════════════════════════════════ */
  it("⚠️ THE MASTHEAD OWNS THE RHYTHM ABOVE THE CONTENT — one element, not an arbitration", () => {
    /* ⚠️ THIS REPLACES THE "ONE TOKEN, NEVER PAID TWICE" RULE, AND THE PROBLEM IT SOLVED IS GONE
       RATHER THAN SOLVED DIFFERENTLY. `--content-top-gap` was the air under the CHROME hairline,
       and it needed arbitrating because it had to sit above whichever element came first below that
       boundary — the toolbar row on pages that had one, the scroll row on pages that did not — with
       `.wpg--tools` zeroing whichever had not paid.

       There is no chrome boundary now. The masthead is the first thing in the scroller and states
       its own air: 24 above, 18 below, then its hairline, then 16 to whatever follows. One element
       declares all of it, so nothing can pay it twice and there is nothing to arbitrate. */
    /* ⚠️ RETARGETED TO `.wsh-body`, AND THE LAW IS UNCHANGED: ONE element states the masthead's
       vertical air, so nothing can pay it twice. The rebuild moved that declaration one level in —
       `.wsh` carries `padding: 0` because the top hairline has to sit ABOVE the text's inset, and
       `.wsh-body` carries the 26/28 the format specifies. Both halves are asserted, because the
       failure this guards against is the air being stated in two places at once. */
    const header = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const wsh = /(?:^|\n)\.wsh\s*\{([^}]*)\}/.exec(header);
    expect(wsh, "the masthead has no rule at all").toBeTruthy();
    expect(strip(wsh![1]), "the masthead itself pays vertical air as well as its body — that is the double-payment this rule forbids")
      .toContain("padding: 0");
    const bodyRule = /(?:^|\n)\.wsh-body\s*\{([^}]*)\}/.exec(header);
    expect(bodyRule, "the masthead's body has no rule at all").toBeTruthy();
    expect(strip(bodyRule![1]), "the masthead stopped stating its own vertical air")
      .toContain("padding: var(--mast-pad-top) 0 var(--mast-pad-btm)");
    /* ⚠️ THE GAP MOVED TO THE SLAB'S BASE (pinned chrome, §1) — it used to sit between the masthead
       and the control row, clearing the masthead's own hairline. Those two are one object now and
       the hairline is at the object's foot, so the air belongs below the whole of it. */
    /* the same claim, over both rules now — a margin on either would put the gap back */
    expect(strip(wsh![1]) + strip(bodyRule![1]), "the masthead kept a bottom margin — the gap belongs below the slab now")
      .not.toContain("margin-bottom");
    /* ⚠️ THE GAP IS THE SPACER'S HEIGHT, NOT THE SLAB'S MARGIN (pinned chrome, §2). A margin here
       collapsed with the content's own and stopped collapsing once the spacer gained height, adding
       one whole gap to the column on every settle — measured, max scroll 1918 → 1934. */
    expect(block(".wpg-scroll > .wpg-chrome"), "the slab took a margin again — it will collapse against the content's").not.toContain("margin-bottom");
    expect(block(".wpg-reclaim"), "the spacer stopped carrying the gap to whatever follows the chrome")
      .toContain("height: var(--wpg-chrome-gap)");

    /* ⚠️ AND NEITHER GRID ROW MAY RE-ADD ONE. A `padding-top` on the scroller would sit ABOVE the
       masthead — pushing the page's title down while claiming to be the gap under it — and the
       control row already states its own 12. */
    expect(block(".wpg-scroll"), "the scroll row pays a top gap again — it would sit above the masthead")
      .not.toContain("padding-top: var(--content-top-gap)");
    const gridCss = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
    const live = gridCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(live, "the once-only arbitration came back — there is nothing left to arbitrate")
      .not.toContain(".wpg--tools > .wpg-scroll");
  });

  /**
   * ⚠️ AND A PAGE ADDS NONE OF ITS OWN — the way the gap actually broke, which is NOT the way the
   * case above guards against.
   *
   * The grid pays the gap once on every page; that half was correct and locked. What no one was
   * watching is a page putting its OWN top padding on the first thing in the scroll row, which is
   * indistinguishable from the gap and simply adds to it. Measured on the deployed build:
   * Comparable titles rendered 92px against a 70px token (`.ct-pagebody`, +22) and Discover 154
   * (`.dv-hero`, +84), while every page that adds nothing measured exactly 70.
   *
   * ⚠️ IT IS NOT A TOOLBAR THING, which is what it looked like. Manuscripts has no toolbar and was
   * clean; To-do has one and was not. The predictor is "does this page pad its own first row", and
   * nothing else.
   *
   * ⚠️ A FRAMED BOX'S PADDING IS ITS OWN, and that distinction is the reason this reads the pixel
   * rather than the source. `.pkgw-strip` has 11px of top padding and is a bordered, filled strip —
   * its content starts 11px inside a box whose EDGE is at the gap, so the gap is still 70. Only a
   * BARE wrapper adds. The measured version of this lives in `gapAudit.measure.ts`; what is
   * asserted here is that the two known offenders stay at zero.
   */
  it("⚠️ NO PAGE ADDS ITS OWN TOP PADDING TO THE FIRST ROW — the gap is the grid's alone", () => {
    const rule = (css: string, sel: string) => {
      const i = css.indexOf(`${sel} {`);
      expect(i, `${sel} has no rule — the anchor this case reads is gone`).toBeGreaterThan(-1);
      return css.slice(i, css.indexOf("}", i));
    };
    const comps = readFileSync(resolve(__dirname, "../manuscripts/comps.css"), "utf8");
    const discover = readFileSync(resolve(__dirname, "../agents/discover.css"), "utf8");
    /* ⚠️ THE VALUE IS EXTRACTED AND COMPARED, never tested with a `(?!0)` lookahead — `\s*`
       backtracks to zero width and the lookahead runs against the space, so `padding: 0` "matches".
       That shape has bitten this repo twice and is banned. */
    const padTop = (r: string) => (/padding:\s*([^;]+);/.exec(r)?.[1] ?? "").trim().split(/\s+/)[0];
    expect(padTop(rule(comps, ".ct-pagebody")), "Comparable titles pads its own body again — its gap renders larger than the token says").toBe("0");
    expect(padTop(rule(discover, ".dv-hero")), "Discover's hero pads its own top again — it rendered a 154px gap against a 70px token").toBe("0");
  });

  /* ══ §3 — THE SCROLL HEMS ═══════════════════════════════════════════════════════════════════ */
  it("⚠️ the hems are grid children of row 3, NOT children of the scroller", () => {
    /* ⚠️ THIS IS THE WHOLE CORRECTNESS OF THE FEATURE, and the obvious version is wrong in a way
       that looks right until you scroll: a child of a scrollport scrolls with its content —
       including an absolutely positioned one, because the scrollport is its containing block — so
       the fade drags up the page instead of hemming it. Asserted at source because there is no
       jsdom here and no layout to measure; the Playwright matrix takes the pixels. */
    const hem = block(".wpg-hem");
    expect(hem, "the hems left the grid — as children of the scroller they scroll with the content").toContain("grid-row: 1");
    /* ⚠️ EVERY ROW MUST NAME THE COLUMN, because grid auto-placement NEVER OVERLAPS: two items
       share a cell only when BOTH are explicitly positioned. Without this the hems took column 1
       and the auto-placed scroller was pushed into an implicit column 2 — browser-measured, the
       header rows read 688px of right margin against 449 on nine of ten pages. */
    for (const sel of [".wpg", ".wpg-scroll", ".wpg-dock", ".wpg-hem"]) {
      expect(block(sel), `${sel} does not name its grid column — an auto-placed row cannot share a cell with the hems`)
        .toMatch(/grid-(column|template-columns):/);
    }
    expect(hem, "the hems must not take pointer events — they sit over the scroller").toContain("pointer-events: none");
    /* ⚠️ THE TOP HEM IS DELETED (pinned header ground, §2) — app-wide. It was built for a masthead
       that SCROLLED AWAY; no page's does now, and against pinned chrome the fade half-erases content
       that is about to pass behind the header anyway. Asserted GONE rather than dropped, so it
       cannot return unnoticed. */
    expect(cssRules, "the top hem came back — see the note at its deletion").not.toMatch(/["\s.]wpg-hem--top[\s.{,]/);
    expect(srcCode, "the top hem is rendered again").not.toMatch(/["\s`]wpg-hem--top["\s`]/);
    /* the BOTTOM hem is a different claim and stays: content below the fold is hidden by the fold */
    expect(block(".wpg-hem--bot"), "the bottom hem is not pinned to the row's bottom edge").toContain("align-self: end");
    expect(block(".wpg-hem--bot"), "the bottom hem is not pinned to the row's bottom edge").toContain("align-self: end");
    /* ⚠️ NO MASK ON THE SCROLLER — it interacts badly with `scrollbar-gutter`, which this row
       depends on for the reservation that stops content jumping sideways mid-filter. */
    expect(block(".wpg-scroll"), "a mask went on the scroller — it fights `scrollbar-gutter`").not.toContain("mask");
    /* the hems are rendered by the grid, so every page gets them identically or none does */
    expect(srcCode, "the bottom hem is not mounted").toContain("wpg-hem--bot");
    expect(srcCode, "the hems are not mounted").toContain("wpg-hem--bot");
  });

  /**
   * ⚠️ A HEM RESOLVES INTO THE GROUND, AND IT MUST NAME THE GROUND'S TOKEN TO DO IT.
   *
   * Both hems carried a hardcoded `#ffffff` — correct, and silently wrong the moment the window
   * went to #fefcfa: a fade from white over a warmer ground is a pale stripe across the top and
   * bottom of every scroller in the app, on every page at once. It shows only against content, so
   * an empty page looks perfect and nothing anywhere errors.
   *
   * ⚠️ THE FAR END IS THE SAME TOKEN'S CHANNELS AT ZERO ALPHA, never `rgba(255,255,255,0)`. That
   * near end and far end are the same colour is the entire definition of a fade; two independently
   * written values can agree today and not tomorrow, and gradient interpolation would run the
   * midpoint through white while both endpoints looked right.
   *
   * ⚠️ ASSERTED BY EXTRACTING THE VALUE, NOT BY A `(?!#)` LOOKAHEAD. `background:\s*(?!.*#)` is the
   * shape this repo has been bitten by twice — `\s*` backtracks to zero width and the lookahead
   * runs against the space. The declaration is pulled out and checked in code.
   */
  it("⚠️ NEITHER HEM PAINTS A LITERAL — both ends read the ground token", () => {
    /* one hem left, and it still reads the ground token rather than a literal */
    for (const sel of [".wpg-hem--bot"]) {
      /* ⚠️ ANCHOR BEFORE SLICING — `block()` returns "" for a selector it cannot find, and every
         `.not.toMatch` below passes happily on an empty string. */
      const b = block(sel);
      expect(b, `${sel} has no rule — the anchor this case reads is gone`).toContain("background:");
      /* the whole block, not just the declaration: a literal is a fault wherever in the rule it sits */
      expect(b, `${sel} paints a hex literal — it will drift from the window's ground and show as a pale band over content: ${b.trim()}`)
        .not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(b, `${sel} paints a bare white — same fault, spelled in rgb`).not.toMatch(/\b255,\s*255,\s*255\b|\bwhite\b/);
      expect(b, `${sel} does not resolve into the window's ground: ${b.trim()}`).toContain("var(--ws-window)");
      expect(b, `${sel}'s transparent end is not the ground's own channels — it fades through a different colour: ${b.trim()}`)
        .toContain("rgba(var(--ws-window-rgb), 0)");
    }
    /* ⚠️ AND THE DOCK, which is the same fault wearing an alpha: `rgba(255,255,255,.86)` is 86% of
       a colour the window no longer has, so it reads as a cold panel over a warm ground. */
    const dock = block(".wpg-dock");
    expect(dock, "the dock has no rule — the anchor this case reads is gone").toContain("background:");
    expect(dock, `the dock's translucent ground is not the window's channels: ${dock.trim()}`).toContain("var(--ws-window-rgb)");
    expect(dock, "the dock went back to a white alpha — 86% of a colour the window no longer has")
      .not.toMatch(/\b255,\s*255,\s*255\b/);
  });

  it("⚠️ the hems are driven by the SAME evaluation as the header — never a second listener", () => {
    /* Two listeners are two answers to "where is this scroller", and they disagree on exactly the
       frames anyone would notice. One `evaluate`, one rAF, both states written from it. */
    expect((srcCode.match(/addEventListener\("scroll"/g) ?? []).length,
      "a second scroll listener appeared — the hems and the header would disagree mid-scroll").toBe(1);
    expect((srcCode.match(/requestAnimationFrame/g) ?? []).length,
      "a second animation frame loop appeared").toBe(1);
    const evaluate = sliceBetween(srcCode, "const evaluate =", "const onScroll");
    expect(evaluate, "the evaluate block was not found — the slice below is testing nothing").toContain("setStuck");
    expect(evaluate, "the hems are not written from the same evaluation as the header").toContain("setHem");
    /* ⚠️ EACH HEM IS A STATE. A top fade on an unscrolled page or a bottom fade at the end of the
       content reads as a rendering fault rather than an affordance. */
    expect(evaluate, "the bottom hem is not conditioned on content remaining below").toContain("scrollHeight - root.clientHeight");
    /* ⚠️ AND THE OBJECT IS COMPARED BEFORE IT IS WRITTEN — a fresh one per frame re-renders the
       whole page on every wheel tick, which a boolean state does not. */
    expect(evaluate, "the hem state is written unconditionally — every wheel tick would re-render the page").toContain("prev");
  });

  it("the scroll row carries `scroll-padding-top` — missing throughout before this", () => {
    expect(block(".wpg-scroll")).toContain("scroll-padding-top");
  });


  /**
   * ⚠️ REVERSED: THE STATE IS DERIVED EVERY FRAME, NOT OBSERVED AT A BOUNDARY. This required an
   * `IntersectionObserver`, on the reasoning that condensing is a boundary event and should be
   * reported once rather than recomputed. The flaw is that an observer fires only on a CHANGE, so
   * one missed or mistimed event leaves the header permanently wrong with nothing to re-evaluate
   * it — measured on a real account as `overflow: 267`, `reclaim: 62`, `safeToStrip: true` and
   * both classes absent. The arithmetic was never wrong. Deriving from `scrollTop` is stateless:
   * no cached decision can go stale and a missed frame self-corrects on the next one.
   */
  it("⚠️ the state is derived from scrollTop every frame, and nothing caches it", () => {
    expect(srcCode, "the IntersectionObserver came back — it reports only on a change, so a missed event is permanent").not.toContain("IntersectionObserver");
    expect(srcCode, "the sentinel came back with it").not.toContain("wpg-sentinel");
    expect(srcCode, "the scroll listener went — nothing would re-evaluate the state").toContain('addEventListener("scroll"');
    expect(srcCode, "the evaluation is not rAF-throttled — it would run per wheel event rather than per painted frame").toContain("requestAnimationFrame");
    expect(srcCode, "the resize observer went — a shortening window crosses the threshold with no scroll at all").toContain("new ResizeObserver");
  });

  /**
   * ⚠️ SYMMETRIC AND STATELESS — and the asymmetry this replaces existed only to survive a clamp
   * that can no longer happen. The latch was `scrollTop > 4 && safeToStrip()` to enter and
   * `scrollTop <= 4` to leave, because stripping shrank max scroll and could clamp `scrollTop`
   * below the entry threshold. `.wpg--working > .wpg-scroll` now adds the reclaim back as
   * `padding-bottom`, so max scroll is identical in both states and the clamp is impossible.
   *
   * With the clamp gone the guard, the dead zone and the asymmetry all go together: the state is
   * `scrollTop > 2` and nothing else. A page that can scroll at all strips the moment it does.
   */
  it("⚠️ THE BAR'S STATE IS DERIVED FROM `scrollTop` — the settle's is deleted outright", () => {
    /**
     * ⚠️ THIS CASE'S SUBJECT IS RETIRED AND ITS SHAPE IS NOT. It asserted that the settle was one
     * bare comparison — `scrollTop > 2`, no `safeToStrip`, no dead zone, no latch, nothing cached
     * between frames — because a cached "is it stuck" is what a missed event makes permanently
     * wrong. There is no settle; there IS a bar, and the same law has to hold for it.
     *
     * ⚠️ THE BAR IS DELIBERATELY NOT ONE BARE COMPARISON, which is the interesting difference.
     * It has HYSTERESIS — in past 150, out below 120 — because equal thresholds flicker at the
     * boundary, and the previous state is therefore a genuine input. What must not happen is that
     * input being read out of React state inside the scroll callback, where the closure captures
     * whatever value it was created with. It lives in a ref, and the ref is what is compared.
     */
    expect(srcCode, "`safeToStrip` came back — it only ever bought a dead zone").not.toContain("safeToStrip");
    /* ⚠️ BOUNDED, BECAUSE `setStuck` IS A PREFIX OF `setStuckH` — which survives and publishes the
       BAR's height for the builder's sticky panel. The unbounded form went red on a correct file
       the moment it was written, which is this repo's oldest lock fault in a new costume. */
    expect(srcCode, "the settle's state is back").not.toMatch(/setStuck\s*\(|restHRef|reclaimedPx/);
    /* the two edges, each asserting ONE direction — which is what makes it a hysteresis rather
       than two competing triggers */
    expect(srcCode, "the bar's entry edge is gone").toMatch(/!barOn\.current && y > BAR_SHOW/);
    expect(srcCode, "the bar's exit edge is gone").toMatch(/barOn\.current && y < BAR_HIDE/);
    expect(srcCode, "the thresholds collapsed to one value — that flickers at the boundary")
      .not.toMatch(/BAR_SHOW\s*=\s*(\d+)[\s\S]{0,80}BAR_HIDE\s*=\s*\1\b/);
    /* ⚠️ THE PREVIOUS STATE IS A REF, NOT THE RENDERED STATE. Reading `bar` inside the callback
       would read the value that closure captured, which is the fault the ref exists to avoid. */
    expect(srcCode, "the hysteresis reads React state rather than the ref").toMatch(/const barOn = React\.useRef/);
    expect((srcCode.match(/setBar\(/g) ?? []).length, "the bar's state is written from more than one place").toBe(1);
  });

  /**
   * ⚠️ THE PADDING IS WHAT MAKES THE ABOVE SAFE, so it is locked beside it rather than in the
   * stylesheet's own file. It must equal the reclaim exactly and must not be transitioned: easing
   * it opens a frame in which max scroll is wrong, which is the clamp again, just harder to see.
   */
  it("⚠️ THE OLD FOLDED NAME BAR STAYS GONE — the new one shares none of its parts", () => {
    /**
     * ⚠️ THIS CASE IS INVERTED AND ITS SUBJECT IS NOT. It asserted that the folded name bar had been
     * deleted outright — component, classes and tokens — because the settled slab kept the masthead
     * on screen and there was nothing left for a bar to say. The rebuild removes the settle, so a
     * bar is the only thing that can carry identity once the masthead has scrolled away, and one is
     * back: `.wpg-bar`, a separate sticky element, 46px, reserving no space.
     *
     * ⚠️ WHAT MUST NOT COME BACK IS THE OLD ONE'S MACHINERY — a bar that grew from 0 to 51px on the
     * same element the control row cleared with `top: var(--wpg-mini-h)`. That is the height-feedback
     * shape the new design is built to avoid, so its tokens and classes are still forbidden and the
     * sweep is still for READS rather than definitions.
     */
    const grid = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");
    const liveSrc = grid.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const liveCss = cssRules.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const token of ["--wpg-mini-h", "--wpg-mini-pad", "--wpg-mini-fs", "--wpg-mini-lh"]) {
      expect(liveCss, `\`${token}\` is still READ or DEFINED — the bar it sized is gone`).not.toContain(token);
    }
    for (const cls of ["wpg-mini", "wpg-mini-name", "wpg-mini-show", "wpg-mini--stuck", "wpg-mini--static"]) {
      expect(liveCss, `\`.${cls}\` still has a rule`).not.toMatch(new RegExp(`\\.${cls}[\\s.,{:]`));
      expect(liveSrc, `\`${cls}\` is still rendered`).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
    }
    /* ⚠️ AND THE NEW BAR'S HEIGHT IS ITS OWN, GIVEN BACK. The old bar's fault was that its height was
       a number a second rule had to clear; this one's is a token it negates itself, so nothing else
       ever reads it. Both halves asserted — the reservation and the negation — because a bar with
       the margin and no height, or the height and no margin, are two different broken pages. */
    expect(liveCss, "the bar stopped declaring its own height").toMatch(/--bar-h:\s*46px/);
    expect(liveCss, "the bar reserves space — everything below it moves when it appears")
      .toContain("margin-bottom: calc(var(--bar-h) * -1)");
    /* ⚠️ READING THE BAR'S TOKEN IS ALLOWED; RESTATING ITS NUMBER IS NOT. The old bar's fault was a
       control row clearing `top: var(--wpg-mini-h)` while the bar GREW from 0 to that height — two
       elements agreeing about a moving number. This bar's height is constant and its token is the
       one source, so the tab rail reading it is the fix rather than the fault. What stays forbidden
       is a literal. */
    /* ⚠️ ANCHORED, BECAUSE `top:` IS A SUFFIX OF `padding-top:` AND `border-top:`. The unanchored
       form matched `padding-top: 11px` on a card's footer and reported it as a sticky offset
       restating a height — the substring fault this repo records against class-name locks, wearing a
       property's clothes. */
    const barTops = [...liveCss.matchAll(/(?:^|[;{\s])top:\s*([^;}]+)/g)].map((m) => m[1].trim());
    for (const t of barTops) {
      expect(t, `a \`top\` restates a height as a literal (\`${t}\`) — read the pinned element's token`)
        .not.toMatch(/^\d+(\.\d+)?px$/);
    }
  });

  it("⚠️ THE RECLAIM IS DELETED, AND SO IS EVERY COMPENSATION FOR IT", () => {
    /**
     * ⚠️ THE HISTORY IS THE VALUE HERE, because the mechanism was rebuilt twice before being
     * removed. The masthead used to SETTLE on pin, giving up ~62px inside the scroller — the
     * SHRINK direction, so a page overflowing by less than the settle was clamped to 0, un-settled
     * and cycled (Noteboard: 37 flips on one pass). The first compensation was `padding-bottom` on
     * the scroller, which held max scroll and let the FLOW collapse: measured, a 10px wheel tick
     * moved a content landmark 67px. The second was a SPACER between the slab and the content,
     * which held both with one number.
     *
     * ⚠️ NOTHING CHANGES HEIGHT ON SCROLL NOW, so there is nothing to compensate. The spacer stays
     * as the chrome GAP alone — it is still an element rather than a margin, because adjacent
     * siblings' margins collapse and this one did, silently, into the content's own.
     */
    const live = cssRules.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(live, "the reclaim came back").not.toContain("--wpg-reclaim-pad");
    expect(live, "the working state started re-declaring the gap token — `manuscriptLibrary.css` reads it for its foot padding")
      .not.toContain("--content-top-gap-work");
    expect(block(".wpg-scroll"), "the foot padding stopped being a sum — a page's own contribution would replace the component's")
      .toContain("padding-bottom: calc(var(--wpg-foot, 0px))");
  });

  it("⚠️ THE GRID NEVER GOES LOOKING FOR ITS SCROLLER — it owns one", () => {
    /* `closest(grid) → querySelector(scroll)` holds until something inside the scroll row is itself
       a scroller, and then it silently finds the wrong one. Two strings coupling two components
       across the DOM is the hardcoded `top` offset again, just harder to spot.
       ⚠️ THE CONTEXT HALF OF THIS IS RETIRED (step 4). It used to end "the context is gone — the
       plate would have to go looking again", because the header read its state through
       `PlateCondensedContext`. The header has no state to read; the union drives a class on the
       grid's own root and the stylesheet reads it from there, which cannot be mounted outside its
       provider and cannot resolve to `null`. What remains is the half that was always the point:
       the grid holds a ref to the element it owns and traverses nothing. */
    /**
     * ⚠️ THE CLAIM IS ABOUT ITS OWN SCROLLER, AND THAT DISTINCTION IS NOW LOAD-BEARING. What this
     * forbids is the grid HUNTING for the row it already holds — `closest(grid) → querySelector
     * (.wpg-scroll)`, two strings coupling two components across the DOM, which finds the wrong
     * element the day anything inside the row is itself a scroller.
     *
     * ⚠️ IT DOES NOT FORBID RESOLVING A SCROLLER THE PAGE NAMED. `scroller` is a selector the page
     * hands in for its own internal zone, because on a `fill` page the frame never scrolls and the
     * bar has to follow the scroll that does. The grid is not searching for something it owns; it
     * is resolving something it was told about, and it picks by which candidate actually scrolls
     * rather than by document order. So the ban is scoped to the row's own class.
     */
    expect(srcCode, "the grid went hunting for its own scroll row — it holds a ref to it")
      .not.toMatch(/querySelector[^(]*\(\s*["'`][^"'`]*wpg-scroll/);
    const lookups = [...srcCode.matchAll(/querySelectorAll?\(([^)]*)\)/g)].map((m) => m[1].trim());
    expect(lookups, `the grid resolves something other than the page's own \`scroller\`: ${lookups.join(" · ")}`)
      .toEqual(["scroller"]);
    expect(srcCode, "a `closest()` traversal appeared").not.toContain("closest(");
    expect(srcCode, "the grid stopped holding a ref to its own scroller").toContain("ref={scrollRef}");
  });

  it("⚠️ NOTHING INFERS THAT THE WRITER HAS STARTED WORKING", () => {
    /**
     * ⚠️ THE FOLD IS DELETED AND THE INFERENCES IT REPLACED STAY DELETED, which is the half of this
     * case worth keeping. The masthead once folded on a three-input union — `stuck ||
     * condensedByMode || engaged` — every term of which was a GUESS that the writer had started
     * working, and the click-anywhere vanish is what that guess produced. `Hide` replaced the guess
     * with one explicit act; the rebuild replaces the act with scrolling, which needs no state at
     * all. What must never come back is the guessing.
     */
    for (const gone of ["condensedByMode", "engaged", "setEngaged", "onPointerDown", "setHidden"]) {
      expect(srcCode, `\`${gone}\` came back — the masthead is inferring engagement again`).not.toContain(gone);
    }
    expect(srcCode, "the fold's state is persisted — there is no fold").not.toContain("localStorage");
  });

  it("⚠️ NOTHING LISTENS FOR ENGAGEMENT ANY MORE", () => {
    /* The scroller and the dock carried `pointerdown` handlers that folded the masthead on the
       first click in the content area. That is deleted with the inference it served: a click in the
       content does nothing to the masthead now. The document-level half of the old rule is worth
       keeping as an absence — one would fire for the sidebar, the breadcrumb and the top bar. */
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");
    const live = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(live, "a pointerdown listener came back").not.toContain("onPointerDown");
    expect(live, "engagement went to the document").not.toMatch(/document\.addEventListener\(\s*["\'`]pointerdown/);
  });

  it("⚠️ THERE IS NO RESTORE AFFORDANCE — the band it belonged to is gone", () => {
    /* The collapsed band WAS the way back: a bare surface with a pointer cursor that you clicked to
       bring the header out again. The masthead does not collapse to a band — on a fill page it
       vanishes outright and returns on the next visit to the page — so there is no surface to
       click and nothing to restore.

       ⚠️ AND NOTHING IS STRANDED BY THAT, which is the condition the whole design rests on: the
       masthead holds no actions, so a visit that never shows it again has cost the writer nothing.
       If a restore ever comes back, this case is what should stop it long enough to ask why. */
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");
    const live = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const gone of ["restorable", "restore"]) {
      expect(live, `\`${gone}\` came back — see the note in this case before reinstating it`).not.toContain(gone);
    }
    /**
     * ⚠️ THE POINTER HALF OF THIS IS RETIRED, AND THIS CASE'S OWN NOTE ASKED FOR EXACTLY THAT: "if a
     * restore ever comes back, this case is what should stop it long enough to ask why." It came
     * back, it was asked, and the answer is on the record — a click-anywhere vanish is replaced by
     * an explicit Hide, and an explicit Hide needs an explicit way back.
     *
     * ⚠️ WHAT CHANGED IS THAT THERE IS A CONTROL NOW. The old affordance was a BARE BAND with a
     * pointer cursor and nothing drawn — a surface that promised something invisible. The restore is
     * a chevron button on the mini bar: visible, labelled, and only on fill pages. The pointer
     * belongs to it, and to nothing else in this sheet.
     */
    const css = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const pointerRules = [...css.matchAll(/([^{}]+)\{[^}]*cursor:\s*pointer[^}]*\}/g)].map((m) => m[1].trim());
    /* ⚠️ TWO CONTROLS, AND BOTH ARE REAL: Hide on the masthead, and the chevron badge on the
       window's border that reverses it (pinned chrome, §3). The rule this case protects is
       unchanged — a pointer cursor may only appear on something that IS a control, never on a bare
       surface promising something invisible, which is what the retired click-to-restore band was.
       ⚠️ AND `.wpg-mini-show` IS GONE FROM THIS LIST AT §4, which is where its deletion is proved.
       The folded name bar no longer renders anywhere, so its pointer cursor was an affordance on an
       element nothing mounts — the same class of residue as a transition with no state to tween. */
    expect(pointerRules.sort(), `a pointer cursor appeared on something that is not one of the fold controls: ${pointerRules.join(" · ")}`)
      /* ⚠️ THE TAB RAIL JOINS THE LIST, AND IT IS A REAL CONTROL RATHER THAN AN EXCEPTION. This case
         guards against a pointer cursor appearing on something that is NOT pressable; the two-view
         tabs are buttons that navigate. Counted, so a decorative element cannot join them quietly. */
      /* ⚠️ THE BROWSING GRID'S CARDS ARE BUTTONS. Counted with the rest, so the list stays a census
         of what is pressable rather than a list of exceptions. */
      /* ⚠️ THE TWO FOLD CONTROLS LEAVE THIS LIST WITH THE FOLD. What the case guards is unchanged
         and is the reason it survives its own subject: a pointer cursor may appear only on
         something that IS pressable, never on a bare surface promising something invisible —
         which is what the retired click-to-restore band was. */
      .toEqual([".qc-card", ".wpg-barback"]);
  });

  /**
   * ⚠️ A PAGE VISIT RESETS ENGAGEMENT, AND UNMOUNTING IS NOT THE SIGNAL. These pages never unmount —
   * the workspace keeps them all mounted and toggles `display` — so state cleared on unmount would
   * be cleared exactly never, and you would return to a page days later still collapsed. The signal
   * is the grid's own box going from zero to non-zero, which is what a visit IS here.
   */
  /**
   * ⚠️ LEAVING A JOURNEY LEAVES THE HEADER COLLAPSED. You were working before it and you still are;
   * handing back the browsing chrome at the moment you have most to do is the wrong direction.
   * The latch is what makes that true after `condensedByMode` has gone false again — and a journey
   * can be opened from the shell's own menus, so no click need ever have landed in the content.
   */
  it("⚠️ THE JOURNEY LATCH IS RETIRED — leaving a journey leaves what the writer chose", () => {
    /**
     * ⚠️ THIS CASE'S SUBJECT IS DELETED (masthead rethink, step 4). The latch set engagement when a
     * journey opened, so that CLOSING one left the header collapsed: "you were working before it
     * and you still are", which was sound while the app was inferring whether you were working.
     *
     * It is not inferring any more. The fold is an explicit Hide, so a journey opening or closing
     * has no business touching it — leaving one leaves the masthead exactly as the writer left it,
     * folded or not. Asserted as an absence, because a latch quietly re-added would take the
     * decision back off them.
     */
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src, "a journey latch came back — the fold is the writer's, not a mode's").not.toMatch(/setHidden\(true\)[\s\S]{0,40}condensed/);
    expect(src, "the grid reads a mode again").not.toContain("condensedByMode");
  });

  it("without the mode, an unscrolled page is at rest", () => {
    const html = renderToStaticMarkup(<WorkspacePageGrid masthead={MAST}>{null}</WorkspacePageGrid>);
    expect(html, "the grid condenses by default — every page would open in the working state").not.toContain("wpg--working");
  });

  it("⚠️ THE ROOT CARRIES THE FOLD, AND NOTHING ELSE DERIVES IT", () => {
    /* The union this case guarded is gone (step 4); what it was really protecting is not — one
       place computes the state, and the stylesheet reads it off the root. */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid masthead={MAST} fill>{null}</WorkspacePageGrid>,
    );
    expect(html, "the fold's class came back").not.toContain("wpg--hidden");
    expect(html, "a plate row came back").not.toContain("wpg-plate");
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ ONE WRITER, WHICH IS WHAT THE UNION CASE WAS FOR. No page-level code may set it and
       nothing may synthesise a scroll position to reach it. */
    expect((src.match(/setBar\(/g) ?? []).length, "the bar's state is written from more than one place").toBe(1);
    expect(src, "the fold came back").not.toContain("setHidden");
  });

  it("⚠️ THE CONTEXT IS DELETED, AND THE PROBLEM ITS `null` SOLVED CANNOT ARISE", () => {
    /**
     * ⚠️ THIS CASE INVERTS, AND THE REASONING IS WORTH KEEPING BECAUSE IT WAS GOOD. The context
     * defaulted to `null` rather than `false` deliberately: `false` is a plausible-looking answer,
     * so a header mounted outside a grid would read it and quietly never condense — a whole page
     * with a header that silently does not work. `null` meant "no grid above me", which a consumer
     * could complain about, and `PageHeader` threw on it in development.
     *
     * The header has no state to read now. The union drives a CLASS on the grid's own root and the
     * stylesheet reads it from there — which cannot be mounted outside its provider, cannot resolve
     * to a plausible default, and needs no throw to say so. The whole failure mode is gone rather
     * than guarded, which is the better outcome and the reason the context goes.
     */
    /* ⚠️ COMMENTS STRIPPED FIRST, AND THIS FILE'S OWN PROSE IS WHY. The retirement is documented in
       `WorkspacePageGrid.tsx` by NAMING what was retired — as every retirement in this codebase is —
       so a bare search over the raw source finds the explanation and calls it the code. Caught on
       the first run of this very case. */
    const live = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(live, "the context came back — the header would have a second way to learn a state it does not have")
      .not.toContain("PlateCondensedContext");
    expect(live, "a React context appeared in the grid at all").not.toContain("createContext");
  });

  it("the scroller holds masthead → control row → content, and NO control row without one", () => {
    const withBar = renderToStaticMarkup(
      <WorkspacePageGrid masthead={MAST} toolbar={<i>tools</i>}>body</WorkspacePageGrid>,
    );
    expect(withBar).toContain("wpg-scroll");
    expect(withBar).toContain("wpg-tools");
    /* ⚠️ THE ORDER REVERSED, AND IT IS THE POINT OF THE PACK. The chrome rows used to be SIBLINGS
       of the scroller, above it, pinned by construction. Both are inside it now: the masthead first,
       so it can leave, then the control row, which is what stays. */
    expect(withBar.indexOf("wpg-scroll")).toBeLessThan(withBar.indexOf("wpg-tools"));
    expect(withBar.indexOf("wpg-scroll"), "the masthead is not inside the scroller").toBeLessThan(withBar.indexOf("Test page"));
    expect(withBar.indexOf("Test page"), "the masthead does not come before the control row").toBeLessThan(withBar.indexOf("wpg-tools"));

    const bare = renderToStaticMarkup(<WorkspacePageGrid masthead={MAST}>body</WorkspacePageGrid>);
    expect(bare, "an empty toolbar row rendered — it would draw its hairline with nothing above it, and reserve space the page does not use").not.toContain("wpg-tools");
  });

  /**
   * ⚠️ THE CONVERSION CENSUS. This started life as "nothing imports it yet" and was updated the
   * moment Contact list converted — deliberately, because that is the point: each page moving is a
   * decision someone records here, not a drift nobody notices.
   *
   * ⚠️ BOTH HALVES MATTER. The converted list proves the new path is live; the UNCONVERTED list
   * proves the old one still is. A half-converted app that typechecks is the failure this
   * sequencing exists to prevent, so the day this list empties is the day the sticky machinery —
   * `.wsh-wrap`, the reservation padding, the frosted state and the legacy scroll listener — comes
   * out, and not before.
   */
  it("⚠️ THE STUCK TREATMENT IS NEVER SERVER-RENDERED — the first paint is the rest state", () => {
    /* `stuck` is derived from `scrollTop`, so a fresh page is at the top by definition. If the class
       ever rendered on the first paint every page would flash a hairline and a shadow on mount —
       and worse, it would be claiming the row is holding still against content that has not moved. */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid masthead={MAST} toolbar={<i>tools</i>}>{null}</WorkspacePageGrid>,
    );
    expect(html).toContain("wpg-tools");
    expect(html, "the row rendered stuck before anything scrolled").not.toContain("wpg-tools--stuck");
  });

  it("⚠️ THE ANCHORED ROW KEEPS THE COUNT, NEVER THE PAGE NAME", () => {
    /* ⚠️ `170-sticky-control-row.html` OFFERS BOTH AS A TOGGLE, and the count is the choice. Once
       the masthead has scrolled away this row is the only thing left stating anything about the
       page — and the page's NAME is the one fact the reader can already get, from the sidebar, from
       the breadcrumb, from what they clicked. The count is not.
       ⚠️ ASSERTED AGAINST RENDERED OUTPUT, so a page cannot slip the title in through a wrapper. */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid
        masthead={<PageHeader variant="workspace" title="Contact list" mark="contacts" />}
        toolbar={<PageTally value="16 of 16" note="4 WITH LIVE QUERIES" />}
      >{null}</WorkspacePageGrid>,
    );
    const row = sliceBetween(html, '<div class="wpg-tools', "</div>");
    expect(row, "the tally is not in the control row").toContain("wpg-tally");
    expect(row, "the page name came back into the anchored row — the reader already knows where they are")
      .not.toContain("Contact list");
  });

  it("⚠️ THE TWO HEADER TYPES ARE DELETED — one masthead, one behaviour", () => {
    /**
     * ⚠️ THE PARTITION IS GONE AND ITS ABSENCE IS ASSERTED, because a classification is exactly the
     * kind of thing that gets half-restored. Type A pinned and settled; Type B sat in flow and
     * folded to a chevron. Every masthead now scrolls away as content and hands off to the bar.
     *
     * ⚠️ AND THE PARTITION'S OWN MEASUREMENT WAS ASSERTING CONTENT RATHER THAN STRUCTURE — it
     * required each scrolling page's row to be currently overflowing, which contradicts the law
     * stated beside it. It was red on `main` before this rebuild began, on whichever page happened
     * to fit that day. Deleted with the thing it partitioned rather than repaired.
     */
    for (const gone of ["wpg--static", "wpg--hidden", "wpg-chevfold", "wpg-mast-hide", "wpg-chrome--stuck"]) {
      expect(cssRules, `\`${gone}\` came back — there is one masthead behaviour`).not.toContain(gone);
    }
    for (const gone of ["data-wpg-type", "MastheadBehaviour", "pinned ?"]) {
      expect(srcCode, `\`${gone}\` came back — the type partition is deleted`).not.toContain(gone);
    }
  });

  it("⚠️ NO PAGE CAN MAKE A MASTHEAD ARRIVE FOLDED", () => {
    /**
     * ⚠️ THIS INVERTS ITS OWN SUBJECT (masthead rethink, step 4), AND THE INVERSION IS THE POINT.
     *
     * It asserted that a fill page whose `condensed` was true at FIRST PAINT arrived with the
     * masthead already collapsed — never drawing one frame of it and snatching it away. That was
     * the right claim while a page could put the header into a folded state on mount.
     *
     * No page can. `condensed` is deleted, the fold is `hidden`, and `hidden` starts false and is
     * set by one button. So the stronger statement is available: the masthead is present on arrival
     * on every page, always, and the frame-of-flicker case cannot arise at all.
     */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid masthead={<PageHeader variant="workspace" title="Manuscripts" mark="manuscripts" />} fill>
        {null}
      </WorkspacePageGrid>,
    );
    expect(html, "a page arrived folded — no page may set that state").not.toContain("wpg--hidden");
    expect(html, "the masthead is not rendered on arrival").toContain("wsh-title");
    expect(html, "the mini bar rendered beside a visible masthead").not.toContain("wpg-mini-name");
  });

  it("⚠️ A CLICK ANYWHERE DOES NOTHING TO THE CHROME", () => {
    /**
     * ⚠️ THE CONTAINMENT TEST IS THE THING TO KEEP OUT. It existed so a click on the header would
     * not fold the header — which is only ever needed while clicks fold anything, and the fact that
     * it had to exist is the clearest statement of what was wrong with inferring engagement.
     * Nothing folds now; a click in the content area, on the masthead or on the dock changes no
     * chrome state at all.
     */
    expect(srcCode, "a containment test came back — it would only be needed if clicks folded again")
      .not.toContain("contains(e.target");
    expect(srcCode, "a click handler on the chrome came back").not.toMatch(/onClick=\{[^}]*setBar/);
  });

  it("⚠️ THE CENSUS — every page that renders a masthead renders it through the grid", () => {
    /* ⚠️ THE PREDICATE IS `variant="workspace"`, NOT `toolbar=`, AND THE FIRST VERSION WAS WRONG.
       It listed only pages that pass a toolbar — so Discover, Submission packages and Analytics were
       absent while all three still rendered the header. Anything that renders a masthead is on this
       list; that is what has to be enumerated.

       ⚠️ AND QUERY CENTRE WAS MISSING FROM IT UNTIL THIS PACK, which is the fault CLAUDE.md records
       in its own words: a matrix that omits the page you just changed is the "all six headers
       identical" report all over again. Ten routes, eight call sites — the Tasks family is three
       pages through one layout. */
    const CONVERTED = [
      ["Query Centre", "../Queries.tsx"],
      ["Contact list", "../agents/AgentList.tsx"],
      ["Manuscripts", "../AllManuscripts.tsx"],
      ["Discover", "../DiscoverNewAgents.tsx"],
      ["Submission packages", "../SubmissionPackages.tsx"],
      ["Analytics", "../QueryAnalytics.tsx"],
      ["Comparable titles", "../manuscripts/ComparableTitlesPage.tsx"],
      ["Tasks family (To-do · Calendar · Noteboard)", "../todo/TasksPageLayout.tsx"],
    ] as const;
    for (const [page, file] of CONVERTED) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      expect(src, `${page} is listed as rendering the grid and no longer does`).toContain("WorkspacePageGrid");
      expect(src, `${page} stopped rendering a masthead`).toContain('variant="workspace"');
    }

    /* ⚠️ COMPARABLE TITLES IS BACK IN `CONVERTED` ABOVE, and the exception row that stood here is
       deleted with the opt-out it described. It asserted the inverse — that the page renders the
       grid and renders NO masthead — and its own message said it would fail if the page ever took
       the shared header back. It did, and it did. The design of that row was right: a page that
       stops qualifying gets an exception row rather than a quiet deletion, which is how a census
       stops covering the app one page at a time. Nothing about that is retracted; only the page's
       membership changed. */


    /* ⚠️ THE OLD PATH IS FULLY GONE, AND BOTH ITS HALVES ARE ASSERTED ABSENT (in-flow masthead).
       The header used to read the grid's condensed state through context and throw when mounted
       without a grid; before that it found its own scroller by walking up from the plate. It has no
       state at all now, so all three are retired together — and a residue of any of them is how a
       future reader concludes the masthead still has a working state. */
    const ph = readFileSync(resolve(__dirname, "PageHeader.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const gone of ["PlateCondensedContext", "useCondensed", "nearestScroller", "mounted outside a WorkspacePageGrid"]) {
      expect(ph, `PageHeader still carries \`${gone}\` — the masthead has no state for it to feed`).not.toContain(gone);
    }
  });

  /**
   * ⚠️ THE VIEWPORT LOCK — `.wpg-scroll` IS THE SCROLLER, AND THE GRID IS INERT WITHOUT IT.
   *
   * The grid pins its chrome by putting it in rows 1 and 2 of `auto auto minmax(0,1fr)`. That only
   * pins anything if the grid HAS a definite height to divide, and for six months of this file's
   * life it did not: `.ws-work` is `flex: 1 0 auto`, shrink 0, so it grows to its content and the
   * whole page scrolls as one document with the plate riding along. Browser-measured on the
   * Contact list before the fix: `.ws-work` 2723px inside a 777px viewport, the real scroller
   * `.ws-wbody`, and `.wpg-scroll` reporting `canScroll: false`.
   *
   * ⚠️ IT PRESENTS AS "STICKY IS BROKEN", WHICH IS WHY THIS IS WORTH A LOCK. The symptom is in the
   * header; the cause is two components above it, in a prop. Two passes were spent inside
   * pageHeader.css before anyone measured the chain.
   *
   * ⚠️ THERE IS NO LAYOUT ENGINE HERE (`environment: 'node'`), so this asserts the CHAIN AT SOURCE,
   * never a measurement: the route opts in, the page root refuses to scroll, and the grid's row 3
   * does. Each link is necessary and none is sufficient — which is precisely why enumerating them
   * beats testing any one.
   */
  it("⚠️ the fixed-viewport chain: the route opts in, the root clips, row 3 scrolls", () => {
    const shell = readFileSync(resolve(__dirname, "AppShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const fit = /fit=\{([\s\S]*?)\}\s*\n/.exec(shell);
    expect(fit, "the `fit` prop is gone from AppShell — every grid page would scroll as a document").toBeTruthy();
    /* ⚠️ `routeKey` IS THE FIRST PATH SEGMENT, so these five keys cover eleven pages. Naming a
       sub-route here (`queries/analytics`) would never match and would read as covered. */
    for (const key of ["queries", "dashboard", "todo", "agents", "manuscripts"]) {
      expect(fit![1], `the \`${key}\` route lost its fixed-viewport opt-in`).toContain(`"${key}"`);
    }

    /* the page roots of every converted page: a definite height, and NOT a second scrollport */
    const ROOTS: [string, string, string][] = [
      ["Contact list", "components/agents/agentList.css", ".aglist"],
      ["Discover", "components/agents/discover.css", ".dv2"],
      ["Manuscripts", "components/manuscripts/manuscripts.css", ".msv1"],
      ["Comparable titles", "components/manuscripts/comps.css", ".ctpage"],
      ["Submission packages", "components/packages/packageWorkshop.css", ".pkgw"],
    ];
    for (const [page, file, sel] of ROOTS) {
      const css = readFileSync(resolve(__dirname, "../..", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      /* ⚠️ EVERY BLOCK FOR THE SELECTOR, JOINED — NOT THE FIRST. Four of these five roots are
         declared TWICE: once for the page's token block and once for its layout. `indexOf` finds
         the token block, which contains no `overflow` at all, so a first-match slice passes
         whatever the layout rule says. VERIFIED: this lock was written that way, went green, and
         stayed green when `.dv2`'s layout rule was mutated to `overflow-y: auto` — it was testing
         a list of custom properties. Same trap as `.wpg-scroll` earlier in this file's history and
         the one CLAUDE.md records; the fix is to read them all.
         ⚠️ AND ANCHOR BEFORE SLICING — no match yields "" and every `.not.toMatch` on an empty
         string passes, which is the house failure mode for source-string specs. */
      const blocks: string[] = [];
      for (let i = css.indexOf(`${sel} {`); i > -1; i = css.indexOf(`${sel} {`, i + 1)) {
        blocks.push(css.slice(i, css.indexOf("}", i)));
      }
      expect(blocks.length, `${page}: no \`${sel} {\` rule — the slice below would test an empty string`).toBeGreaterThan(0);
      expect(blocks.join("\n"), `${page}: its root scrolls, so the chrome is inside a scrollport and rides away with the content`)
        .not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    }

    /* ⚠️ AND THE SAME CHECK IN THE MARKUP, BECAUSE ONE OF THEM HID THERE. Submission packages
       carried `overflowY: "auto"` in an INLINE style object on its root — invisible to every CSS
       lock above and to any grep of packageWorkshop.css — so its plate scrolled away while the
       four sibling pages pinned theirs. Inline wins over the stylesheet, which is the same reason
       CLAUDE.md records for the rail's `display` and the help FAB's `right`. */
    /* ⚠️ RESTATED, NOT SHARED WITH THE CENSUS ABOVE. A `const` in the enclosing `describe` reads
       as tidier and is the house trap: the two tests then fail together for one edit and the
       message names the wrong lock. Each `it` states the anchor it consumes. */
    const PAGES: [string, string][] = [
      ["Contact list", "../agents/AgentList.tsx"],
      ["Manuscripts", "../AllManuscripts.tsx"],
      ["Comparable titles", "../manuscripts/ComparableTitlesPage.tsx"],
      ["Discover", "../DiscoverNewAgents.tsx"],
      ["Submission packages", "../SubmissionPackages.tsx"],
      ["Analytics", "../QueryAnalytics.tsx"],
    ];
    for (const [page, file] of PAGES) {
      const tsx = readFileSync(resolve(__dirname, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(tsx, `${page}: an inline overflow on the page markup puts the grid inside a scrollport, and no stylesheet lock can see it`)
        .not.toMatch(/overflow(Y|X)?:\s*["'](auto|scroll)["']/);
    }

    const grid = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
    const at = grid.indexOf(".wpg-scroll {");
    expect(at, "no `.wpg-scroll {` rule").toBeGreaterThan(-1);
    expect(grid.slice(at, grid.indexOf("}", at)), "row 3 stopped scrolling — nothing on the page does now")
      .toMatch(/overflow-y:\s*auto/);
  });
});

/**
 * ══ EVERY MODIFIER THE STYLESHEET KEYS ON IS ACTUALLY EMITTED ═════════════════════════════════
 *
 * ⚠️ WRITTEN BECAUSE ONE WAS NOT, AND NOTHING NOTICED FOR A WHOLE PHASE. `.wpg--record` carried the
 * record view's entrance — the fade-and-scale from `qc-view-transition.html`, built to the ref,
 * reported as landed — and the component never put the class on the root. The rule was valid, the
 * keyframe was correct, the animation had no subject, and the page simply appeared. It reached dev.
 *
 * ⚠️ IT IS THE FAMILY THIS REPO KEEPS PAYING FOR, one level along: not a replacement that leaves the
 * original reachable, but a replacement with no CALLER. The cheap general guard is the one below —
 * name every modifier the sheet selects on and require the component to emit it — because it holds
 * for the next one as well as this one.
 *
 * ⚠️ COMMENT-STRIPPED, OR IT FINDS ITS OWN OBITUARIES. `.wpg--tools` and `.wpg--working` are both
 * retired and both still discussed in prose across four stylesheets; a raw-text sweep reports them
 * as live rules and demands the component resurrect them.
 */
describe("no modifier is styled without being emitted", () => {
  it("every `.wpg--*` a stylesheet selects on is set by the component", () => {
    const sheets = readdirSync(resolve(__dirname, ".."), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(resolve(__dirname, "..", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""));
    const styled = new Set<string>();
    for (const sheet of sheets) {
      for (const m of sheet.matchAll(/\.(wpg--[a-z-]+)/g)) styled.add(m[1]);
    }
    expect(styled.size, "no modifiers found at all — the sweep read nothing").toBeGreaterThan(1);
    const orphans = [...styled].filter((c) => !srcCode.includes(`" ${c}"`));
    expect(orphans, `styled but never emitted: ${orphans.join(", ")}`).toEqual([]);
    console.log(`   modifiers styled and emitted: ${[...styled].sort().join(", ")}`);
  });
});

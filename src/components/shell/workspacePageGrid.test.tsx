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
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WorkspacePageGrid, PlateCondensedContext } from "./WorkspacePageGrid";

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

describe("the three-row grid — chrome outside the scroller", () => {
  it("⚠️ NOTHING IS STICKY AND NOTHING TAKES A `top` — that is the whole point", () => {
    /* The sticky arrangement encoded another element's height as a literal (`calc(56px + gap)`),
       which was silently wrong by 32px on the Tasks family. Siblings of the scroller need no
       offset, so there is no number to get wrong. */
    expect(cssRules, "a sticky position came back into the grid — chrome outside the scroller does not need one, and needing one is the bug").not.toContain("position: sticky");
    /* ⚠️ EXTRACT THE VALUE, DO NOT LOOK AHEAD PAST IT. The first draft was
       `not.toMatch(/top\s*:\s*(?!0)/)` and it flagged `top: 0` — `\s*` backtracks to zero width, so
       the lookahead tested the SPACE rather than the digit and passed. Reading each declaration and
       comparing it says what is meant, and cannot be defeated by backtracking. */
    const tops = [...cssRules.matchAll(/(?:^|[;{\s])top\s*:\s*([^;}]+)/gm)].map((m) => m[1].trim());
    for (const value of tops) {
      expect(value, `a non-zero \`top\` offset appeared (\`top: ${value}\`) — that is another element's height encoded as a literal, the \`calc(100vh - 64px)\` fault`).toBe("0");
    }
    expect(srcCode, "the component reintroduced sticky positioning").not.toContain("sticky");
  });

  it("the scroll row is `minmax(0, 1fr)` — a plain `1fr` grows to its content and never scrolls", () => {
    expect(block(".wpg"), "the grid lost its row template").toContain("grid-template-rows: auto auto minmax(0, 1fr)");
    expect(block(".wpg"), "the grid itself started scrolling — only row 3 may").toContain("overflow: hidden");
    expect(block(".wpg-scroll"), "the scroll row stopped scrolling").toContain("overflow-y: auto");
    expect(block(".wpg-scroll"), "`min-height: 0` went — the row will refuse to shrink below its content and push the frame open").toContain("min-height: 0");
  });

  it("⚠️ EVERY ROW IS PLACED EXPLICITLY — auto-placement breaks the toolbar-less pages", () => {
    /* Without a toolbar, auto-placement puts the scroller in track 2 (an `auto` track), so it sizes
       to its content and never scrolls — on exactly the pages with least to show. */
    expect(block(".wpg-plate")).toContain("grid-row: 1");
    expect(block(".wpg-tools")).toContain("grid-row: 2");
    expect(block(".wpg-scroll")).toContain("grid-row: 3");
  });

  it("the toolbar row has NO container — one hairline, no frame, no fill", () => {
    const t = block(".wpg-tools").replace(/\s+/g, " ");
    expect(t, "the toolbar gained a fill — it is controls and a hairline, not a second plate").not.toMatch(/(^|[;\s])background\s*:/);
    expect(t, "the toolbar gained a shadow").not.toMatch(/(^|[;\s])box-shadow\s*:/);
    expect(t, "the toolbar gained a full border — the one line beneath it is the chrome/content boundary").not.toMatch(/(^|[;\s])border\s*:/);
    /* ⚠️ REVERSED: THE TOOLBAR MUST NOT DRAW A HAIRLINE. This required one, from before the line
       moved to row 1 — so every toolbar page rendered TWO lines 20px apart in the working state.
       The boundary between chrome and content is row 1's bottom edge; row 2 is below it. */
    expect(t, "the toolbar drew a hairline of its own — that is a second line under the header's").not.toMatch(/(^|[;\s])border-bottom\s*:/);
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
  it("⚠️ the header's edges sit exactly the inset inside the content's, at three widths", () => {
    /* ⚠️ THE TOKENS LIVE IN pageHeader.css, NOT THIS SHEET — the grid READS them and defines
       neither, which is the point: one declaration, three consumers. */
    const tokenCss = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
    const root = /:root\s*\{[^}]*--content-gutter:\s*(\d+)px[^}]*--header-inset:\s*(\d+)px[^}]*\}/s.exec(tokenCss);
    expect(root, "the two width tokens are not both declared on :root — every width below is unresolvable").toBeTruthy();
    const gutter = Number(root![1]);
    const inset = Number(root![2]);
    expect(gutter, "the gutter went to zero — content would touch the window edge").toBeGreaterThan(0);
    expect(inset, "the inset went to zero — the header would be the content's width and the card would read as a band").toBeGreaterThan(0);

    /* the three rows state those tokens as PADDING — a max-width anywhere re-creates the centred
       column whose scrollbar took 15px off the content under classic scrollbars */
    expect(block(".wpg-plate"), "the header row stopped reading gutter + inset")
      .toContain("padding-inline: calc(var(--content-gutter) + var(--header-inset))");
    expect(block(".wpg-tools"), "the toolbar row left the content gutter — it would not line up with the cards beneath it")
      .toContain("var(--content-gutter)");
    expect(block(".wpg-scroll"), "the gutter left the scrollport, so the scrollbar comes out of the content column again")
      .toContain("padding-inline: var(--content-gutter)");
    for (const sel of [".wpg-plate", ".wpg-tools", ".wpg-scroll"]) {
      expect(block(sel), `${sel} took a max-width — widths are relationships, not caps`).not.toContain("max-width");
    }

    /* the relationship itself, computed at three windows — no figure is written down */
    for (const win of [1280, 1700, 2400]) {
      const content = win - 2 * gutter;
      const header = content - 2 * inset;
      expect(header, `at ${win}px the header is not ${inset}px inside the content on each side`).toBe(win - 2 * (gutter + inset));
      expect(content - header, `at ${win}px the header/content difference is not twice the inset`).toBe(2 * inset);
      expect(header, `at ${win}px the header has collapsed — the inset is too large for this window`).toBeGreaterThan(0);
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
    ];
    for (const [page, file] of PAGES) {
      const pageCss = readFileSync(resolve(__dirname, "../..", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(pageCss, `${page} still declares --wpg-cap — the cap token is retired`).not.toContain("--wpg-cap");
      expect(pageCss, `${page} still declares --pg-gut — the gutter is the grid's, declared once`).not.toContain("--pg-gut:");
      expect(pageCss, `${page} reads --sa-col-max, which no longer exists — its width resolves to nothing`).not.toContain("--sa-col-max");
    }
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
   * ⚠️ THE LATCH IS ASYMMETRIC, AND SYMMETRY IS THE BUG IT PREVENTS. Entry needs BOTH a scroll and
   * `safeToStrip()`; exit needs only a return to the top. Making exit the inverse of entry
   * oscillates: stripping reclaims height, max scroll falls, the browser clamps `scrollTop` below
   * where it was, the entry condition re-tests false and the header flips back.
   */
  it("⚠️ entry tests safeToStrip, exit tests only the scroll position", () => {
    const latch = /setStuck\(\(was\) => \(was \? ([^:]+) : ([^)]+)\)\)/.exec(srcCode);
    expect(latch, "the latch is not written as one expression — its asymmetry cannot be read").toBeTruthy();
    const [, whenWorking, whenResting] = latch!;
    expect(whenResting, "entry stopped checking safeToStrip — a page that cannot afford the strip would enter it and oscillate").toContain("safeToStrip");
    expect(whenWorking, "exit gained the safeToStrip test, making it the inverse of entry — that is the oscillation").not.toContain("safeToStrip");
    expect(whenWorking, "exit stopped testing the scroll position").toContain("scrollTop");
  });

  it("⚠️ THE PLATE IS TOLD, IT DOES NOT LOOK — no DOM traversal, no class strings", () => {
    /* `closest(grid) → querySelector(scroll)` holds until something inside the scroll row is itself
       a scroller, and then it silently finds the wrong one. Two strings coupling two components
       across the DOM is the hardcoded `top` offset again, just harder to spot. */
    expect(srcCode, "a DOM lookup for the scroller appeared — that is the fragility the context replaces").not.toContain("querySelector");
    expect(srcCode, "a `closest()` traversal appeared").not.toContain("closest(");
    expect(src, "the context is gone — the plate would have to go looking again").toContain("PlateCondensedContext");
  });

  /**
   * ⚠️ THE UNION DRIVER (spec §4). `condensed = stuck || mode`, and the point is that the header
   * never learns which half fired — it takes one boolean through context, so a page cannot grow a
   * second way of being condensed and the header cannot behave differently depending on why.
   *
   * ⚠️ `||`, NOT A PRIORITY. A journey opened part-way down a scrolled page is still working, and
   * closing it while the page is still scrolled must not restore the card. Either half alone is
   * sufficient and neither can veto the other.
   */
  it("⚠️ the mode half condenses with no scrolling at all", () => {
    const seen: (boolean | null)[] = [];
    const Probe: React.FC = () => { seen.push(React.useContext(PlateCondensedContext)); return null; };
    renderToStaticMarkup(
      <WorkspacePageGrid plate={<Probe />} condensed>{null}</WorkspacePageGrid>,
    );
    /* there is no IntersectionObserver in this environment, so `stuck` can only be false here —
       which is exactly the case worth locking: the mode alone must be enough */
    expect(seen[0], "the mode input does not reach the header — a workspace page would never strip, because nothing scrolls on it").toBe(true);
  });

  it("without the mode, an unscrolled page is at rest", () => {
    const seen: (boolean | null)[] = [];
    const Probe: React.FC = () => { seen.push(React.useContext(PlateCondensedContext)); return null; };
    renderToStaticMarkup(<WorkspacePageGrid plate={<Probe />}>{null}</WorkspacePageGrid>);
    expect(seen[0], "the grid condenses by default — every page would open in the working state").toBe(false);
  });

  it("⚠️ the row and the header read ONE value, so they cannot disagree", () => {
    const html = renderToStaticMarkup(<WorkspacePageGrid plate={<span />} condensed>{null}</WorkspacePageGrid>);
    expect(html, "row 1 did not take the working class from the mode — the header would flatten inside a row still holding its inset").toContain("wpg-plate--working");
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src, "the union is not computed in one place — two derivations of one state is how the row and the header come to disagree")
      .toMatch(/const condensed = stuck \|\| condensedByMode;/);
    /* ⚠️ ONE WRITER AGAIN, AND FEWER IS THE POINT. The observer era had two — one to set on the
       sentinel moving, one to clear on resize. The derived version has a single `evaluate()` that
       both the scroll listener and the ResizeObserver call, so there is exactly one place the
       state is computed and no second path that can disagree with it. What the lock is for is
       unchanged: no page-level code may write it, and nothing may synthesise a scroll position. */
    expect((src.match(/setStuck\(/g) ?? []).length, "the state is written from more than one place — two derivations of one boolean is how they come to disagree").toBe(1);
    expect(src, "the safe-to-strip guard went — stripping reclaims height, which can un-scroll a page and start it oscillating").toContain("safeToStrip");
    expect(src, "the threshold is a literal — it must be the reclaimed height, read from the tokens")
      .toMatch(/--wsh-plate-h[\s\S]{0,120}--wsh-plate-h-scrolled/);
  });

  it("⚠️ the context default is `null`, distinguishable from `false`", () => {
    /* `false` would be a plausible default and a plate mounted outside a grid would read it and
       quietly never condense. `null` means "no grid above me", which a consumer can complain about. */
    expect(src).toContain("React.createContext<boolean | null>(null)");
    let seen: boolean | null | undefined;
    const Probe: React.FC = () => { seen = React.useContext(PlateCondensedContext); return null; };
    renderToStaticMarkup(<Probe />);
    expect(seen, "the context no longer defaults to null outside a grid").toBeNull();
  });

  it("renders three rows, and NO toolbar row when there is no toolbar", () => {
    const withBar = renderToStaticMarkup(
      <WorkspacePageGrid plate={<i>plate</i>} toolbar={<i>tools</i>}>body</WorkspacePageGrid>,
    );
    expect(withBar).toContain("wpg-plate");
    expect(withBar).toContain("wpg-tools");
    expect(withBar).toContain("wpg-scroll");
    /* the chrome rows are SIBLINGS of the scroller — the plate must not be inside it */
    expect(withBar.indexOf("wpg-plate")).toBeLessThan(withBar.indexOf("wpg-scroll"));

    const bare = renderToStaticMarkup(<WorkspacePageGrid plate={<i>plate</i>}>body</WorkspacePageGrid>);
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
  it("⚠️ THE CONVERSION IS PARTIAL, and both halves are asserted", () => {
    /* ⚠️ THE PREDICATE IS `variant="workspace"`, NOT `toolbar=`, AND THE FIRST VERSION WAS WRONG.
       It listed only pages that pass a toolbar — so Discover, Submission packages and Analytics were
       absent from BOTH halves while all three still rendered the sticky plate. The census would have
       read "empty" with three pages still depending on `.wsh-wrap`, the reservation and the frost,
       and the cleanup commit would have deleted machinery in use. Anything that renders the plate is
       on one path or the other; that is what has to be enumerated. */
    const CONVERTED = [
      ["Contact list", "../agents/AgentList.tsx"],
      ["Manuscripts", "../AllManuscripts.tsx"],
      ["Comparable titles", "../manuscripts/ComparableTitlesPage.tsx"],
      ["Discover", "../DiscoverNewAgents.tsx"],
      ["Submission packages", "../SubmissionPackages.tsx"],
      ["Analytics", "../QueryAnalytics.tsx"],
      /* the last three, converted at step 5 — which is what lets the sticky path be deleted */
      ["Tasks family", "../todo/TasksPageLayout.tsx"],
    ] as const;
    /* ⚠️ THE CENSUS BRIEFLY GREW A "NO PLATE" HALF, AND THAT WAS THE CENSUS BEING WRONG RATHER
       THAN THE WORLD MOVING. `ee0094b` put the plate on all three Tasks pages; `a7b5d54` reverted
       it; a later pass read the reverted source, concluded the Tasks family had left the plate
       behind, and rewrote this half to assert the ABSENCE of `variant="workspace"` — pinning a
       regression as though it were a decision. The half is `NOT_YET` again, meaning exactly what
       it always meant: still on the sticky plate, awaiting conversion to the grid.
       ⚠️ THE LESSON, AND IT IS WHY THIS COMMENT STAYS: a census read off current source can only
       ever describe what is there. It cannot tell a decision from a revert, so when its two halves
       stop fitting, the first question is which commit last moved the page — not which half to
       widen. */
    /* ⚠️ NOT_YET IS EMPTY, AND THAT IS THE SIGNAL TO DELETE THE OLD PATH. Every page that renders a
       plate is on the grid. `.wsh-wrap`'s `position: sticky`, its height reservation and the legacy
       scroll listener exist ONLY for pages on the other path, and there are none — step 7 removes
       them. Until then the half stays declared and empty rather than deleted, so the fact that it
       is empty is asserted rather than merely true. */
    const NOT_YET: readonly (readonly [string, string])[] = [];
    for (const [page, file] of CONVERTED) {
      expect(
        readFileSync(resolve(__dirname, file), "utf8"),
        `${page} is listed as converted but no longer renders the grid`,
      ).toContain("WorkspacePageGrid");
    }
    for (const [page, file] of NOT_YET) {
      const t = readFileSync(resolve(__dirname, file), "utf8");
      expect(t, `${page} converted — move it into CONVERTED above, and check whether this was the LAST one`).not.toContain("WorkspacePageGrid");
      expect(t, `${page} is still on the old path, so it must still render the plate the old way`).toContain('variant="workspace"');
    }
    /* the legacy path must survive while anything is still on it */
    const ph = readFileSync(resolve(__dirname, "PageHeader.tsx"), "utf8");
    expect(ph, "PageHeader stopped consuming the grid — converted pages would fall back to the scroll listener and condense on the wrong element").toContain("PlateCondensedContext");
    expect(ph, "the legacy scroll listener went while pages are still on it — they would stop condensing entirely").toContain("useCondensed");
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

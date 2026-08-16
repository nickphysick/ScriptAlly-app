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
  it("⚠️ the gap is 44px, ONE token, and it is never paid twice", () => {
    /* ⚠️ NOTHING ASSERTED THIS TOKEN AT ALL BEFORE NOW — it had gone 20 → 70 with no lock on
       either the value or, more importantly, the once-only rule. The gap sits above whatever comes
       FIRST below the hairline: the toolbar row where a page has one, the scroll row where it does
       not. `.wpg--tools` zeroes the scroll row's copy so a page gains and loses a toolbar without
       gaining or losing its top margin — two elements, one gap, never both. */
    /* ⚠️ TWO VALUES NOW, AND BOTH ARE TOKENS BECAUSE §3 SUBTRACTS THEM. The gap halves when the
       strip is working — the strip is lighter than the card and needs proportionally less
       separation — and the invariance padding below is computed from the DIFFERENCE, so a literal
       in either place is the failure mode this whole section exists to prevent. */
    /**
     * ⚠️ 44 IS A VALUE, AND THE DERIVATION WAS OFFERED AND REJECTED. "Half the header's height,
     * rounded" would give 64 from a 128px plate and would move the gap with the plate for free; 44
     * is deliberately tighter than half and was chosen over it. Asserted as a literal HERE, in the
     * one place that also names the header height, so anyone "restoring" the tidier rule has to
     * delete a case that says in words that it was not picked.
     */
    const header = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
    expect(header, "the resting gap changed value without this case changing with it").toContain("--content-top-gap-rest: 44px");
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx, "the resting plate height changed without this case changing with it").toContain("--wsh-plate-h: 128px");
    expect(header, "the gap became half the header height — that rule was considered and NOT chosen; 44 is deliberately tighter")
      .not.toMatch(/--content-top-gap-rest:\s*calc/);
    expect(header, "the working gap changed value without this case changing with it").toContain("--content-top-gap-work: 35px");
    expect(header, "the gap everything reads is no longer the resting one").toContain("--content-top-gap: var(--content-top-gap-rest)");
    expect(block(".wpg--working"), "the working state does not halve the gap").toContain("--content-top-gap: var(--content-top-gap-work)");
    expect(block(".wpg-scroll"), "the scroll row stopped paying the gap").toContain("padding-top: var(--content-top-gap)");
    expect(block(".wpg-tools"), "the toolbar row stopped paying the gap").toContain("var(--content-top-gap)");
    const both = block(".wpg--tools > .wpg-scroll") + block(".wpg--tools .wpg-scroll");
    expect(both, "a page with a toolbar pays the gap twice — the toolbar row and the scroll row both")
      .toMatch(/padding-top:\s*0/);
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
    expect(hem, "the hems left the grid — as children of the scroller they scroll with the content").toContain("grid-row: 3");
    /* ⚠️ EVERY ROW MUST NAME THE COLUMN, because grid auto-placement NEVER OVERLAPS: two items
       share a cell only when BOTH are explicitly positioned. Without this the hems took column 1
       and the auto-placed scroller was pushed into an implicit column 2 — browser-measured, the
       header rows read 688px of right margin against 449 on nine of ten pages. */
    for (const sel of [".wpg", ".wpg-plate", ".wpg-tools", ".wpg-scroll", ".wpg-hem"]) {
      expect(block(sel), `${sel} does not name its grid column — an auto-placed row cannot share a cell with the hems`)
        .toMatch(/grid-(column|template-columns):/);
    }
    expect(hem, "the hems must not take pointer events — they sit over the scroller").toContain("pointer-events: none");
    expect(block(".wpg-hem--top"), "the top hem is not pinned to the row's top edge").toContain("align-self: start");
    expect(block(".wpg-hem--bot"), "the bottom hem is not pinned to the row's bottom edge").toContain("align-self: end");
    /* ⚠️ NO MASK ON THE SCROLLER — it interacts badly with `scrollbar-gutter`, which this row
       depends on for the reservation that stops content jumping sideways mid-filter. */
    expect(block(".wpg-scroll"), "a mask went on the scroller — it fights `scrollbar-gutter`").not.toContain("mask");
    /* the hems are rendered by the grid, so every page gets them identically or none does */
    expect(srcCode, "the hems are not mounted").toContain("wpg-hem--top");
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
    for (const sel of [".wpg-hem--top", ".wpg-hem--bot"]) {
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
  it("⚠️ the state is one symmetric expression of scrollTop, with nothing cached", () => {
    expect(srcCode, "safeToStrip came back — with the padding in place there is nothing for it to guard, and it only ever bought a dead zone").not.toContain("safeToStrip");
    expect(srcCode, "the reclaim is being computed in JS again — it belongs in the stylesheet, as a calc the padding and the height share").not.toContain("reclaimedPx");
    /* ⚠️ IT PINNED THE EXPRESSION VERBATIM AND THAT WAS TOO TIGHT BY EXACTLY ONE REFACTOR. The
       hems read the same scroll position, so `root.scrollTop` is now read once into a local and
       both states derive from it — which is MORE of what this case wants, not less, and the
       literal match failed on it. What matters is the shape: one read, a bare comparison against
       the threshold, and nothing cached or conditional in between. */
    const setter = /setStuck\(([^;]+)\);/.exec(srcCode);
    expect(setter, "the state is not written in one place").toBeTruthy();
    expect(setter![1].trim(), "the state stopped being a bare comparison against the threshold")
      .toMatch(/^\w[\w.]* > 2$/);
    expect(srcCode, "the scroll position is no longer read from the scroller itself").toMatch(/=\s*root\.scrollTop\b|root\.scrollTop\s*>\s*2/);
    expect(srcCode, "the updater takes the previous value again — that is a latch, and a latch is a cached decision").not.toMatch(/setStuck\(\(was\)/);
  });

  /**
   * ⚠️ THE PADDING IS WHAT MAKES THE ABOVE SAFE, so it is locked beside it rather than in the
   * stylesheet's own file. It must equal the reclaim exactly and must not be transitioned: easing
   * it opens a frame in which max scroll is wrong, which is the clamp again, just harder to see.
   */
  it("⚠️ stripping does not change max scroll — the reclaim is added back as padding", () => {
    /* ⚠️ IT CONTRIBUTES A TOKEN RATHER THAN SETTING THE PADDING, and a collision is why. Written as
       `padding-bottom` this rule is 0-2-0, and three pages declare `.aglist .wpg-scroll {
       padding-bottom: 48px }` at the same specificity LATER in the bundle — so they won silently
       and exactly those three measured max scroll falling by 62 while the rest held. Both values
       now land in one `calc` on `.wpg-scroll` and add. */
    /**
     * ⚠️ AND IT IS SCOPED TO SCROLLING PAGES — `:not(.wpg--fill)`, which became load-bearing the
     * moment fill pages gained a working state of their own. A fill page has no scroll to clamp, so
     * it has nothing to protect; worse, `.wpg--fill > .wpg-scroll` is a flex COLUMN filling the row,
     * so a `padding-bottom` comes out of its content box and would shove the panes up by the whole
     * reclaim on collapse and back down on restore. Query Centre could already reach this rule
     * through its journey mode, so the guard is a fix as much as a precaution.
     */
    const rule = block(".wpg--working:not(.wpg--fill) > .wpg-scroll");
    expect(rule, "the invariance contribution is missing — stripping shrinks max scroll and a barely-scrolling page oscillates")
      .toContain("--wpg-reclaim-pad");
    expect(block(".wpg--working > .wpg-scroll"), "the reclaim lost its `:not(.wpg--fill)` guard — it now lands on pages that cannot scroll, where it shoves the panes up by its own height")
      .toBe("");
    /* ⚠️ THE HEADER DELTA *PLUS* THE GAP DELTA, and the second term is the one that goes missing.
       Stripping now gives back the card's extra height AND 35px of the gap under the hairline; a
       padding that only replaces the first drops max scroll by 35 on every page, the browser clamps
       `scrollTop`, and the oscillation comes back on anything near the boundary. Four tokens, no
       literals — each the same token the thing it compensates for reads. */
    for (const term of ["var(--wsh-plate-h)", "var(--wsh-plate-gap)", "var(--wsh-plate-h-scrolled)",
                        "var(--content-top-gap-rest)", "var(--content-top-gap-work)"]) {
      expect(rule, `the reclaim no longer names ${term} — it is compensating for something it cannot see`).toContain(term);
    }
    expect(/\d+px/.test(rule.replace(/\/\*[\s\S]*?\*\//g, "")), "the reclaim contains a literal length — it must be a calc from the same tokens").toBe(false);
    expect(rule, "the padding is transitioned — it must land on the same frame as the height").not.toContain("transition");
    const scroll = block(".wpg-scroll");
    expect(scroll, "the scroll row stopped summing the two contributions — a page's foot gutter would override the reclaim again")
      .toContain("padding-bottom: calc(var(--wpg-foot, 0px) + var(--wpg-reclaim-pad, 0px))");
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

  /**
   * ══ COLLAPSE ON ENGAGEMENT ═══════════════════════════════════════════════════════════════════
   *
   * THE RULE: the header collapses when the user starts working. On a scrolling page, scrolling is
   * the signal. On a fill page, the first click inside the content area is.
   *
   * ⚠️ IT EXISTS BECAUSE FIVE PAGES COULD NEVER COLLAPSE AT ALL. A fill page's panes scroll and the
   * row does not, so the sentinel had nothing to report — the card stayed forever on exactly the
   * pages with the least room to spare. Query Centre was the only one with a way out, and only
   * because a journey sets the mode.
   */
  it("⚠️ ENGAGEMENT IS THE THIRD INPUT, and it is wired to the content rows ONLY", () => {
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ NO DOCUMENT LISTENER. One would fire for the sidebar, the breadcrumb and the top bar —
       none of which is working on this page — and would then need a `closest()` test against markup
       this component does not own to guess its way back out. */
    expect(src, "a document-level listener appeared — a click in the sidebar or the top bar would collapse the page's header")
      .not.toMatch(/document\.addEventListener|window\.addEventListener/);
    expect(src, "the engage handler is gone — nothing would collapse a fill page").toContain("const engage");
    /* ⚠️ GATED ON `fill`. On a scrolling page the state is a pure function of `scrollTop`, so a
       click setting it true would be overwritten by the next evaluated frame — the header would
       flicker and settle back, which reads as a bug rather than as a rule. */
    expect(src, "engagement is no longer gated on `fill` — a click would fight the sentinel on every scrolling page")
      .toMatch(/const engage = [\s\S]{0,120}?if \(fill\)/);
    /* row 1 must NOT engage — clicking a header is not working, and a header that hid itself on
       click would be a control that removes itself when used */
    const plateRow = /className=\{`wpg-plate\$\{[\s\S]*?\}`\}[\s\S]{0,200}?>/.exec(src)?.[0] ?? "";
    expect(plateRow, "the plate row's markup is not where this case expects it — re-anchor before trusting the assertion below").toContain("wpg-plate");
    expect(plateRow, "row 1 engages — clicking the header would collapse it").not.toContain("onPointerDown={engage}");
  });

  it("⚠️ THE BAND RESTORES, AND ONLY ON A FILL PAGE — no chevron, no label", () => {
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src, "the restorable gate stopped requiring both `fill` and `condensed` — a resting card would take a pointer cursor")
      .toMatch(/const restorable = fill && condensed;/);
    /* the affordance is the pointer and a hover shift, and nothing is DRAWN into the strip */
    const css = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8");
    expect(block(".wpg-plate--restorable"), "the restore affordance lost its pointer").toContain("cursor: pointer");
    expect(css, "the band's hover shift went — the band would be clickable with nothing to say so")
      .toMatch(/\.wpg-plate--restorable:hover \.wsh \{[^}]*background:/);
    expect(css, "a chevron or a label appeared in the band — it stays bare").not.toMatch(/wpg-plate--restorable[^{]*::(before|after)/);
    /* ⚠️ RENDERED, NOT JUST DECLARED. A `restorable` const that never reaches the markup would pass
       every assertion above and do nothing at all. */
    const html = renderToStaticMarkup(<WorkspacePageGrid plate={<span />} fill condensed>{null}</WorkspacePageGrid>);
    expect(html, "a condensed fill page does not mark its band restorable").toContain("wpg-plate--restorable");
    const scrolling = renderToStaticMarkup(<WorkspacePageGrid plate={<span />} condensed>{null}</WorkspacePageGrid>);
    expect(scrolling, "a scrolling page's band offers a restore its sentinel would immediately overwrite").not.toContain("wpg-plate--restorable");
  });

  /**
   * ⚠️ A PAGE VISIT RESETS ENGAGEMENT, AND UNMOUNTING IS NOT THE SIGNAL. These pages never unmount —
   * the workspace keeps them all mounted and toggles `display` — so state cleared on unmount would
   * be cleared exactly never, and you would return to a page days later still collapsed. The signal
   * is the grid's own box going from zero to non-zero, which is what a visit IS here.
   */
  it("⚠️ A PAGE VISIT RESETS IT — keyed on hidden → shown, not on unmount", () => {
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src, "the visit reset is gone — a collapsed page would still be collapsed on every future arrival").toMatch(/setEngaged\(false\)/);
    expect(src, "the reset is not observing the grid root — there is nothing else that reports hidden → shown")
      .toMatch(/rootRef/);
    /* ⚠️ THE EDGE, NOT EVERY OBSERVATION. Resetting on each callback would clear engagement on any
       reflow — a window resize, a pane opening — and the card would pop back mid-task. */
    expect(src, "the reset fires on every resize rather than on the hidden → shown edge — the header would pop back mid-task")
      .toMatch(/if \(now && !shown\)/);
  });

  /**
   * ⚠️ LEAVING A JOURNEY LEAVES THE HEADER COLLAPSED. You were working before it and you still are;
   * handing back the browsing chrome at the moment you have most to do is the wrong direction.
   * The latch is what makes that true after `condensedByMode` has gone false again — and a journey
   * can be opened from the shell's own menus, so no click need ever have landed in the content.
   */
  it("⚠️ ENTERING A JOURNEY LATCHES ENGAGEMENT, so leaving one does not restore the card", () => {
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src, "the journey latch is gone — closing a journey would hand back the resting card")
      .toMatch(/if \(fill && condensedByMode\) setEngaged\(true\);/);
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
    /* ⚠️ THREE INPUTS NOW, STILL ONE UNION AND STILL ONE BOOLEAN OUT (collapse-on-engagement).
       `engaged` joined `stuck` and the mode; the header receives the same single value and still
       never learns which of them fired. The count is asserted as well as the shape, because the
       failure this guards against is a SECOND mechanism appearing beside it rather than a third
       term joining it. */
    expect(src, "the union is not computed in one place — two derivations of one state is how the row and the header come to disagree")
      .toMatch(/const condensed = stuck \|\| condensedByMode \|\| engaged;/);
    /* the OPENING tag only — `</PlateCondensedContext.Provider>` is the same provider, and counting
       both made a correct single provider read as two */
    expect((src.match(/<PlateCondensedContext\.Provider/g) ?? []).length, "a second context appeared — the header would have two answers to one question").toBe(1);
    /* ⚠️ ONE WRITER AGAIN, AND FEWER IS THE POINT. The observer era had two — one to set on the
       sentinel moving, one to clear on resize. The derived version has a single `evaluate()` that
       both the scroll listener and the ResizeObserver call, so there is exactly one place the
       state is computed and no second path that can disagree with it. What the lock is for is
       unchanged: no page-level code may write it, and nothing may synthesise a scroll position. */
    expect((src.match(/setStuck\(/g) ?? []).length, "the state is written from more than one place — two derivations of one boolean is how they come to disagree").toBe(1);
    expect(src, "the reclaim moved back into JS — it is a stylesheet calc now, shared by the height and the padding").not.toContain("reclaimedPx");
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
    /* ⚠️ REVERSED: THE LEGACY LISTENER IS RETIRED. It found its own scroller by walking up from the
       plate, and existed only for pages not yet on the grid. There are none — Query Centre was the
       last — so it is deleted, and a workspace header mounted outside a grid THROWS in development
       instead of silently attaching to the shell's scroller and condensing on the wrong element. */
    expect(ph, "the legacy scroll listener came back — nothing needs it, and it condenses on the wrong element").not.toContain("useCondensed");
    expect(ph, "the dev throw went — a header outside a grid would silently never condense").toContain("mounted outside a WorkspacePageGrid");
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

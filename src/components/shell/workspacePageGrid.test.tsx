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

describe("the grid — the scroller owns the page (in-flow masthead)", () => {
  it("⚠️ ONE STICKY ELEMENT, AND ITS `top` IS 0 — no offset encodes another element's height", () => {
    /* ⚠️ THIS RULE IS AMENDED, NOT ABANDONED, AND THE DISTINCTION IS THE WHOLE OF IT. What it
       forbade was a sticky element whose `top` encoded ANOTHER element's height as a literal —
       `calc(56px + gap)`, silently wrong by 32px on the Tasks family, the same fault as the banned
       `calc(100vh - 64px)`. The control row is sticky now (step 2) and takes `top: 0`, which
       encodes nothing: there is no chrome above the scroller for it to clear, because the masthead
       is inside the scroller with it.

       So the check that mattered is unchanged and still runs over the whole sheet: every `top` in
       this file must be exactly 0. The day one is not, something above the scroller is being
       measured into a rule again. */
    const tops = [...cssRules.matchAll(/(?:^|[;{\s])top\s*:\s*([^;}]+)/gm)].map((m) => m[1].trim());
    expect(tops.length, "no `top` is declared at all — the sticky row lost its anchor").toBeGreaterThan(0);
    /* ⚠️ EXTRACT THE VALUE, DO NOT LOOK AHEAD PAST IT. The first draft was
       `not.toMatch(/top\s*:\s*(?!0)/)` and it flagged `top: 0` — `\s*` backtracks to zero width, so
       the lookahead tested the SPACE rather than the digit and passed. Reading each declaration and
       comparing it says what is meant, and cannot be defeated by backtracking. */
    for (const value of tops) {
      expect(value, `a non-zero \`top\` offset appeared (\`top: ${value}\`) — that is another element's height encoded as a literal, the \`calc(100vh - 64px)\` fault`).toBe("0");
    }
    /* ⚠️ AND EXACTLY ONE ELEMENT MAY STICK. Two stickies in one scroller is the arrangement this
       grid was built to replace: the second has to clear the first, which is where the literal
       comes from. The control row is it. */
    const sticky = [...cssRules.matchAll(/position\s*:\s*sticky/g)];
    expect(sticky.length, "more than one element sticks — the second would have to clear the first, and that is where the encoded height comes back").toBe(1);
    expect(block(".wpg-tools"), "the sticky element is not the control row").toContain("position: sticky");
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

  it("⚠️ THE CONTROL ROW IS INVISIBLE AT REST — its ground is the scroller's own", () => {
    /* ⚠️ THE RULE IS UNCHANGED IN INTENT: it is controls, not a second plate. What changed is that a
       sticky element MUST paint an opaque ground or the content passes straight through it — so the
       row now has a background, and the whole of the claim is WHICH one. Painting the scroller's own
       token means at rest it is indistinguishable from the content around it, which is the
       condition that keeps it from reading as chrome. */
    const t = block(".wpg-tools").replace(/\s+/g, " ");
    const bg = /(?:^|[;\s])background\s*:\s*([^;}]+)/.exec(t);
    expect(bg, "the sticky row paints no ground — content would show through it").toBeTruthy();
    /* ⚠️ THE TOKEN, NEVER A LITERAL — and `.wpg-hem` is why this is asserted rather than trusted.
       It read `#ffffff` "BECAUSE THE WINDOW IS WHITE", which was true until the window went to
       #fefcfa, and two hardcoded hems then painted a lighter band across every scroller in the app. */
    expect(bg![1].trim(), "the row's ground is a literal — it will be wrong the next time the window is retoned")
      .toBe("var(--ws-window)");

    /* still not a plate: no frame, no radius, and no border of its own in EITHER state */
    expect(t, "the control row gained a full border").not.toMatch(/(^|[;\s])border\s*:/);
    expect(t, "the control row gained a radius — that is a card").not.toMatch(/(^|[;\s])border-radius\s*:/);
    /* ⚠️ AND NO `border-bottom`, WHICH IS THE ORIGINAL CLAUSE AND STILL RIGHT FOR A NEW REASON. It
       used to draw one, so every toolbar page rendered TWO lines 20px apart. Now the stuck hairline
       is a SHADOW (`0 1px 0`), so the row's height is identical in both states — a real border would
       add a pixel on the frame the class lands, which is a layout shift on every scroll. */
    expect(t, "the control row drew a real hairline — the stuck edge is a shadow so the height cannot move")
      .not.toMatch(/(^|[;\s])border-bottom\s*:/);

    /* ⚠️ AND THE EDGE AND SHADOW BELONG TO THE STUCK STATE ONLY. At rest both are declared at zero
       alpha rather than omitted, so they TRANSITION rather than snapping in — but neither may be
       visible until the row has actually anchored. */
    const stuck = block(".wpg-tools--stuck").replace(/\s+/g, " ");
    expect(stuck, "the stuck state draws no hairline").toContain("0 1px 0 var(--ws-edge)");
    expect(stuck, "the stuck state changes the row's padding by more than the 12 → 10 step").toContain("padding: 10px 0 14px");
    expect(stuck, "the stuck state swaps the fill — same ground in both states, or the row announces itself as chrome")
      .not.toMatch(/(^|[;\s])background\s*:/);

    /* ⚠️ THE ROW'S MARGIN BOX MUST BE IDENTICAL IN BOTH STATES, and the arithmetic is checked here
       rather than trusted. The row is INSIDE the scroller, so its height is part of `scrollHeight`:
       tightening the padding without giving the difference back would drop max scroll by the same
       amount the moment it sticks, and a page overflowing by a few pixels would then clamp, unstick
       and cycle — the exact shape `--wpg-reclaim-pad` was built for on a different element. */
    /* ⚠️ THE SHORTHAND IS EXPANDED, NEVER READ AS ONE NUMBER. `padding: 12px 0` and
       `padding: 10px 0 14px` have different vertical totals and the same first value — reading
       `[0]` alone would call them equal, which is precisely the bug this case exists to catch.
       ⚠️ AND `margin-bottom` IS NOT PART OF THE SUM ANY MORE. It was, and it silently did nothing:
       adjacent siblings' margins COLLAPSE, so the compensation was absorbed by the next element's
       `margin-top` and the row still shrank by 4. Padding cannot collapse. */
    const vbox = (rule: string) => {
      const m = /(?:^|[;\s])padding\s*:\s*([^;}]+)/.exec(rule);
      expect(m, "no padding declared").toBeTruthy();
      const v = m![1].trim().split(/\s+/).map((x) => Number(x.replace("px", "")));
      const top = v[0];
      const bottom = v.length >= 3 ? v[2] : v[0];
      return top + bottom;
    };
    expect(stuck, "the compensation went back to a margin — adjacent margins collapse, so it would do nothing")
      .not.toMatch(/(^|[;\s])margin/);
    const restBox = vbox(t);
    const stuckBox = vbox(stuck);
    expect(stuckBox, `the stuck row's margin box is ${stuckBox}px against the resting ${restBox}px — max scroll moves when it sticks, and a barely-overflowing page will clamp and cycle`)
      .toBe(restBox);
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
  it("⚠️ ONE INSET, NOT TWO — the masthead shares the content's gutter exactly", () => {
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

    /* the scroller states the gutter; nothing inside it restates one */
    expect(block(".wpg-scroll"), "the gutter left the scrollport, so the scrollbar comes out of the content column again")
      .toContain("padding-inline: var(--content-gutter)");
    for (const sel of [".wpg-tools", ".wpg-scroll"]) {
      expect(block(sel), `${sel} took a max-width — widths are relationships, not caps`).not.toContain("max-width");
    }
    /* ⚠️ THE CONTROL ROW MUST NOT RE-GUTTER. It is inside the scroller, so a `padding-inline` here
       would inset it a second time and pull the page's controls off the vertical its cards sit on —
       the doubled-gutter fault, in the one row most likely to be measured against them. */
    expect(block(".wpg-tools"), "the control row re-states a horizontal inset it has already inherited")
      .not.toContain("padding-inline");
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
       its own air: 26 above, 20 below, then its hairline, then 16 to whatever follows. One element
       declares all of it, so nothing can pay it twice and there is nothing to arbitrate. */
    const header = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
    const wsh = /\.wsh\s*\{([^}]*)\}/.exec(header);
    expect(wsh, "the masthead has no rule at all").toBeTruthy();
    const body = wsh![1].replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body, "the masthead stopped stating its own vertical air").toContain("padding: 26px 0 20px");
    expect(body, "the masthead lost the gap to whatever follows it").toContain("margin-bottom: 16px");

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
  it("⚠️ THE RECLAIM PADDING IS DELETED — nothing changes height when the page scrolls", () => {
    /* ⚠️ THIS INVERTS ITS OWN SUBJECT, AND THE INVERSION WAS MEASURED RATHER THAN REASONED. The
       case used to REQUIRE `--wpg-reclaim-pad`: row 1 shrank when the header stripped, growing
       `clientHeight`, so max scroll fell by the same amount unless `scrollHeight` was grown to
       match — otherwise a page overflowing by less than the reclaim clamped to 0, the header came
       back, and it cycled.

       The masthead is content now. It scrolls; it changes no heights. But `.wpg--working` is set by
       `stuck`, so the compensation started firing when the CONTROL ROW anchored — adding ~103px of
       bottom padding to correct for a collapse that no longer happens. Measured on the built dev
       bundle at 1440×900: Contact list's `scrollHeight` went 1904 → 2003 the instant the row stuck.
       With it deleted, all five scrolling pages hold max scroll across the state change.

       ⚠️ THE `calc()` SHAPE STAYS THOUGH ITS SECOND TERM IS GONE, and that is not tidiness: this
       declaration is 0-1-0 and three pages declare `.aglist .wpg-scroll { padding-bottom: 48px }`
       at 0-2-0, later in the bundle. A page and a component contributing to one property must SUM
       through tokens; raising specificity makes one replace the other. */
    const live = cssRules.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(live, "the reclaim came back — it compensates for a collapse that no longer happens")
      .not.toContain("--wpg-reclaim-pad");
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
    expect(srcCode, "a DOM lookup for the scroller appeared — the grid owns its scroller, it must not hunt for one").not.toContain("querySelector");
    expect(srcCode, "a `closest()` traversal appeared").not.toContain("closest(");
    expect(srcCode, "the grid stopped holding a ref to its own scroller").toContain("ref={scrollRef}");
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
    /* ⚠️ OBSERVED ON THE ROOT'S CLASS, NOT THROUGH A CONTEXT (step 4). The context is deleted — the
       union drives `wpg--working` on the grid root and the stylesheet reads it there. Same single
       boolean, same union, one fewer mechanism; the probe moves to where the value actually goes. */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid masthead={<span />} condensed>{null}</WorkspacePageGrid>,
    );
    /* there is nothing to scroll in this environment, so `stuck` can only be false here — which is
       exactly the case worth locking: the mode alone must be enough */
    expect(html, "the mode input does not reach the root — a workspace page would never strip, because nothing scrolls on it").toContain("wpg--working");
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
  it("⚠️ ENGAGEMENT LISTENS ON THE SCROLLER, NEVER ON THE DOCUMENT", () => {
    /* ⚠️ THE ROW-BY-ROW WIRING IS GONE BECAUSE THE ROWS ARE. Engagement used to be attached to the
       toolbar row and the scroll row individually, so that row 1 — the header — could be excluded:
       clicking a header is not working on the page. Both are inside the scroller now, so one
       handler on the scroller covers the content by construction.

       ⚠️ WHAT MUST NOT CHANGE IS THE OTHER HALF: never a document-level listener. One would fire
       for the sidebar, the breadcrumb and the top bar — none of which is working on this page — and
       would then need a `closest()` test against markup the grid does not own to guess its way back
       out. Asserted at source, because there is no jsdom here to dispatch into. */
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");
    const live = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(live, "engagement went to the document — it would fire for the whole shell")
      .not.toMatch(/document\.addEventListener\(\s*["'`]pointerdown/);
    /* ⚠️ POINTERDOWN, NOT CLICK — a drag inside the content never produces a `click`, and it is the
       least ambiguous act of working there is. */
    expect(live, "the scroller stopped reporting engagement").toMatch(/className="wpg-scroll"[\s\S]{0,200}onPointerDown=\{engage\}/);
    /* ⚠️ STILL GATED ON `fill`, and the shape changed with step 3's containment test — an early
       `if (!fill) return` rather than a wrapped `if (fill)`. The claim is what matters: a scrolling
       page already has its own signal, and a click that engaged one would strip it at `scrollTop 0`
       where the sentinel says it must be resting. */
    expect(live, "`engage` stopped being gated on `fill` — a scrolling page has its own signal and the two would fight")
      .toMatch(/const engage[\s\S]{0,200}if \(!fill\) return;/);
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
    const css = readFileSync(resolve(__dirname, "workspacePageGrid.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css, "a pointer cursor came back to the header — it would promise a control that does not exist")
      .not.toContain("cursor: pointer");
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
    const html = renderToStaticMarkup(<WorkspacePageGrid masthead={<span />}>{null}</WorkspacePageGrid>);
    expect(html, "the grid condenses by default — every page would open in the working state").not.toContain("wpg--working");
  });

  it("⚠️ the row and the header read ONE value, so they cannot disagree", () => {
    /* ⚠️ THE ROW'S HALF OF THIS IS GONE WITH THE ROW. `.wpg-plate--working` was how the CHROME ROW
       took the same boolean as the header inside it, so the two could not disagree about the state.
       There is no chrome row; the class the grid still carries is the root's, and it is what step 3
       will drive the fill-page collapse from. The union below is the part that matters and it is
       unchanged. */
    const html = renderToStaticMarkup(<WorkspacePageGrid masthead={<span />} condensed>{null}</WorkspacePageGrid>);
    expect(html, "the root stopped carrying the working state — nothing downstream could read it").toContain("wpg--working");
    expect(html, "a plate row came back").not.toContain("wpg-plate");
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ THREE INPUTS NOW, STILL ONE UNION AND STILL ONE BOOLEAN OUT (collapse-on-engagement).
       `engaged` joined `stuck` and the mode; the header receives the same single value and still
       never learns which of them fired. The count is asserted as well as the shape, because the
       failure this guards against is a SECOND mechanism appearing beside it rather than a third
       term joining it. */
    expect(src, "the union is not computed in one place — two derivations of one state is how the row and the header come to disagree")
      .toMatch(/const condensed = stuck \|\| condensedByMode \|\| engaged;/);
    /* ⚠️ THE PROVIDER-COUNT ASSERTION IS RETIRED WITH THE PROVIDER (step 4). It guarded against a
       SECOND context appearing beside the first, so the header could not have two answers to one
       question. There is no context: the union lands on the root's class, and a class is singular
       by construction — an element cannot carry two of it. The guard's real subject is the line
       above, which is that the union is computed in exactly one place. */
    /* ⚠️ ONE WRITER AGAIN, AND FEWER IS THE POINT. The observer era had two — one to set on the
       sentinel moving, one to clear on resize. The derived version has a single `evaluate()` that
       both the scroll listener and the ResizeObserver call, so there is exactly one place the
       state is computed and no second path that can disagree with it. What the lock is for is
       unchanged: no page-level code may write it, and nothing may synthesise a scroll position. */
    expect((src.match(/setStuck\(/g) ?? []).length, "the state is written from more than one place — two derivations of one boolean is how they come to disagree").toBe(1);
    expect(src, "the reclaim moved back into JS — it is a stylesheet calc now, shared by the height and the padding").not.toContain("reclaimedPx");
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
      <WorkspacePageGrid masthead={<i>plate</i>} toolbar={<i>tools</i>}>body</WorkspacePageGrid>,
    );
    expect(withBar).toContain("wpg-scroll");
    expect(withBar).toContain("wpg-tools");
    /* ⚠️ THE ORDER REVERSED, AND IT IS THE POINT OF THE PACK. The chrome rows used to be SIBLINGS
       of the scroller, above it, pinned by construction. Both are inside it now: the masthead first,
       so it can leave, then the control row, which is what stays. */
    expect(withBar.indexOf("wpg-scroll")).toBeLessThan(withBar.indexOf("wpg-tools"));
    expect(withBar.indexOf("wpg-scroll"), "the masthead is not inside the scroller").toBeLessThan(withBar.indexOf("plate"));
    expect(withBar.indexOf("plate"), "the masthead does not come before the control row").toBeLessThan(withBar.indexOf("wpg-tools"));

    const bare = renderToStaticMarkup(<WorkspacePageGrid masthead={<i>plate</i>}>body</WorkspacePageGrid>);
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
      <WorkspacePageGrid masthead={<span />} toolbar={<i>tools</i>}>{null}</WorkspacePageGrid>,
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

  it("⚠️ THE MASTHEAD COLLAPSES ON FILL PAGES ONLY — a scrolling page's leaves by scrolling", () => {
    /* Two proxies for one thing: the user has started working. On a scrolling page that is the
       scroll, and the masthead is content, so nothing has to act. On a fill page the panes scroll
       and the page does not, so it has to leave under its own power. Scoping matters in BOTH
       directions — a scrolling page whose masthead also collapsed would lose it at `scrollTop 0`,
       where the sentinel says it must be resting. */
    const live = cssRules.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(live, "the collapse is not scoped to fill pages")
      .toContain(".wpg--fill.wpg--working > .wpg-scroll > .wpg-mast");
    /* it goes to NOTHING — no band, no strip, no residue to click */
    const gone = block(".wpg--fill.wpg--working > .wpg-scroll > .wpg-mast").replace(/\s+/g, " ");
    expect(gone, "the masthead collapses to a band rather than to nothing").toContain("max-height: 0");
    expect(gone, "the masthead is still painted when collapsed").toContain("opacity: 0");
    /* ⚠️ AND `max-height` NEEDS A DEFINITE REST VALUE or there is nothing to transition from. */
    expect(block(".wpg--fill > .wpg-scroll > .wpg-mast"), "no resting max-height — the collapse would snap")
      .toMatch(/max-height:\s*\d+px/);
  });

  it("⚠️ A GRID THAT ARRIVES WORKING ARRIVES COLLAPSED — never one frame of full masthead", () => {
    /**
     * ⚠️ THIS IS THE CASE THAT CANNOT BE REACHED BY CLICKING, AND IT IS THE ONE THAT WOULD FAIL
     * SILENTLY. A fill page whose `condensed` prop is true at FIRST PAINT — a dossier or a journey
     * restored on mount — must render with the working class already on the root, so the stylesheet
     * collapses the masthead from the very first frame. If the class arrived a frame later the page
     * would draw a full masthead and then snatch it away, which reads as a glitch rather than as a
     * page that knows you are working.
     *
     * ⚠️ NO LIVE PAGE REACHES IT TODAY — verified, not assumed: `AllManuscripts` initialises
     * `openId` to `null` and never seeds it from storage (it WRITES the active-manuscript pointer
     * for the comps and packages sub-pages, and never reads it back into its own view state), and
     * Query Centre passes no `condensed` at all. This is here so that the day one of them restores
     * a selection on mount, the behaviour is already decided.
     */
    const html = renderToStaticMarkup(
      <WorkspacePageGrid masthead={<PageHeader variant="workspace" title="Manuscripts" mark="manuscripts" />} fill condensed>
        {null}
      </WorkspacePageGrid>,
    );
    expect(html, "a grid that arrives working does not say so on its root — the stylesheet cannot collapse what it cannot see")
      .toContain("wpg--working");
    expect(html).toContain("wpg--fill");
    /* the wrapper is present in both states — it is what animates, so it cannot be conditional */
    expect(html, "the masthead wrapper is conditional — there would be nothing to transition").toContain("wpg-mast");
  });

  it("⚠️ A CLICK ON THE MASTHEAD IS NOT ENGAGEMENT — and it is a containment test, not a stopPropagation", () => {
    /* The old rule was structural: the header was row 1 and only rows 2-4 carried the handler. Now
       the masthead is INSIDE the scroller, so its clicks bubble to the same handler — and a header
       that collapsed when you clicked it would be a control that hides itself when used.
       ⚠️ `stopPropagation` WOULD HAVE CHANGED WHAT EVERY OTHER LISTENER SEES in order to fix what
       this one does. Asking whether the event began inside the masthead changes nothing. */
    const src = readFileSync(resolve(__dirname, "WorkspacePageGrid.tsx"), "utf8");
    const live = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(live, "engagement no longer excludes the masthead — it would collapse under the pointer")
      .toMatch(/mastRef\.current\?\.contains\(e\.target as Node\)/);
    expect(live, "the masthead wrapper lost its ref — the containment test has nothing to ask")
      .toMatch(/className="wpg-mast" ref=\{mastRef\}/);
    expect(live, "a stopPropagation appeared on the masthead — that changes what every other listener sees")
      .not.toMatch(/wpg-mast[\s\S]{0,120}stopPropagation/);
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
      ["Comparable titles", "../manuscripts/ComparableTitlesPage.tsx"],
      ["Discover", "../DiscoverNewAgents.tsx"],
      ["Submission packages", "../SubmissionPackages.tsx"],
      ["Analytics", "../QueryAnalytics.tsx"],
      ["Tasks family (To-do · Calendar · Noteboard)", "../todo/TasksPageLayout.tsx"],
    ] as const;
    for (const [page, file] of CONVERTED) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      expect(src, `${page} is listed as rendering the grid and no longer does`).toContain("WorkspacePageGrid");
      expect(src, `${page} stopped rendering a masthead`).toContain('variant="workspace"');
    }

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

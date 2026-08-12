/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — PAGE LAYOUT locks (rebuild v2, phase 2).
 *
 * jsdom cannot measure a width, a gutter or a grid reflow, so these lock the CAUSES the pixels
 * follow from: the padding/cap split, the grid track floor, and — the one that matters most —
 * that nothing compensates for the right-gutter bug with extra right-hand padding. A compensating
 * pad would look correct at one viewport and wrong at every other, and would hide the real cause
 * from whoever reads this next.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/shell/AppShell.tsx", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = css.indexOf(selector + " {");
  if (i === -1) return "";
  return css.slice(i, css.indexOf("}", i));
};

describe("agent list · the page column", () => {
  /* ⚠️ RETARGETED ONTO THE WIDTH RELATIONSHIP (header spec §1). These two locks pinned
     `--sa-col-gut: 60px` and `--sa-col-max: 1240px` — a gutter and a CAP. Both are retired:
     widths are the window minus a gutter, the header that minus an inset, and no maximum exists
     anywhere. Asserting the old pair would now fail correctly and read as a regression.
     What still has to hold on THIS page is that it states no width of its own — the grid states
     them all — which is what the two locks below check. */
  const headerCss = readFileSync(new URL("../components/shell/pageHeader.css", import.meta.url), "utf8");

  it("the shared gutter is declared once, and this page does not restate it", () => {
    expect(
      headerCss,
      "--content-gutter left :root — every page's content width becomes unresolvable at once",
    ).toMatch(/--content-gutter:\s*\d+px/);
    expect(
      css,
      "the agent list declared a gutter of its own again — two gutters is how four different page paddings happened",
    ).not.toMatch(/--pg-gut:/);
    expect(
      css,
      "a cap came back to this page — the scrollbar comes out of the content column again, on this page alone",
    ).not.toContain("max-width: var(--wpg-cap)");
  });

  it("padding rides the page, the gutter rides the grid — two elements, two jobs", () => {
    expect(
      block(".aglist .agl-page"),
      /* ⚠️ THE TOP LEFT TOO, AND THAT REVERSES THE NOTE THAT STOOD HERE. It read "the top stays
         14px — the workspace header sits inside this padding", which was true of this page and of
         nothing else: measured across the ten pages the same inset was 0, 11, 14, 16 and 22, so
         the one element every page shares sat at five different distances from the window's top
         edge. The gap above the header is `--wsh-plate-gap`, owned by the grid. Sides went to the
         scroll row at header spec §1; the 48px bottom went into the scroller at amendment 9. What
         is left is nothing, stated. */
      "the page reintroduced an inset — every side of this rule belongs to the grid now",
    ).toContain("padding: 0 0 0");
    /* ⚠️ A CONTRIBUTION, NOT A PADDING. It sets `--wpg-foot`, which the grid sums with the working
       state's reclaim — as a raw `padding-bottom` this rule silently overrode the reclaim, because
       both are 0-2-0 and the page sheet comes later in the bundle. */
    expect(
      block(".aglist .wpg-scroll"),
      "the bottom gutter left the scroller — the last card butts against the frame with nothing under it",
    ).toContain("--wpg-foot: 48px");
    expect(
      css,
      "the inner column took a width again — it must simply fill the guttered scroll row",
    ).toContain(".aglist .agl-inner { width: 100%; }");
  });

  it("NO compensating right-hand padding anywhere — the gutter is fixed at its cause", () => {
    expect(
      block(".aglist .agl-page"),
      "a padding-right override appeared on the page — that is the symptom fix the pack forbids; it papers over the viewport-anchored furniture and drifts at other viewports",
    ).not.toMatch(/padding-right/);
    expect(
      block(".aglist .agl-inner"),
      "a padding-right override appeared on the inner column — same objection: compensate the cause, never the edge",
    ).not.toMatch(/padding-right/);
  });

  it("THREE columns to a row, 18px gap — fixed, not auto-fill (agent-list-fixes P3)", () => {
    const grid = css.match(/\.aglist \.agl-grid \{([^}]*)\}/)?.[1] ?? "";
    expect(grid).toContain("grid-template-columns: repeat(3, 1fr)");
    expect(grid).toContain("gap: 18px");
    expect(grid).not.toContain("repeat(auto-fill"); // the card width follows the content cap now
    // the reflow: two up (desktop-side), then one below md — the 700px hand-rolled breakpoint
    // migrated to the single mobile/desktop divider (Mobile Pass 1 breakpoint law)
    expect(css).toMatch(/@media \(max-width: 1100px\) \{ \.aglist \.agl-grid \{ grid-template-columns: repeat\(2, 1fr\); \} \}/);
    expect(css).toMatch(/@media \(max-width: 767\.98px\) \{ \.aglist \.agl-grid \{ grid-template-columns: 1fr; \} \}/);
  });
});

/**
 * THE RIGHT-GUTTER CAUSE (diagnosed as checklist item 2 — viewport-anchored furniture).
 * `.sa-tltab` was moved to the capsule edge in an earlier pack; the help FAB was missed, and its
 * bare right:20 measured from the browser edge, overhanging the ground gutter on the right only.
 */
describe("the help FAB is RETIRED — Help centre lives in the shared account menu now", () => {
  it("the floating FAB and its inline right-inset are gone, so it cannot mismeasure anything", () => {
    expect(shell).not.toContain('className="ashell-help-fab"');
    // it was one of the three suspects in the right-gutter bug; removing it removes the class
    const v2 = readFileSync(new URL("../components/shell/ShellV2.tsx", import.meta.url), "utf8");
    // Help is a row in the SHARED account menu now (app-shell pack, Baked 11) — not a bar
    // button, and certainly not a floating FAB measured from the browser edge.
    const am = readFileSync(resolve(__dirname, "..", "components", "shell", "AccountMenu.tsx"), "utf8");
    expect(am).toContain("Help centre");
  });
});


/**
 * ⚠️ SHADOW-ONLY HOVER FOR CARDS FLUSH TO A CLIPPED EDGE (amendment 11, commit 4).
 *
 * `CLAUDE.md` states the rule and the reason: a hover LIFT on a card inside a clipping container
 * pushes the lifted edge through the clip. Since the grid conversion the cards sit in `.wpg-scroll`
 * — `overflow-y: auto`, which clips both axes — with the top row flush to its top edge, so the old
 * `translate(-2px, -2px)` cost the top-left cards a sliver on hover.
 *
 * ⚠️ THE TEMPTING WRONG FIX IS PADDING. Adding room for the lift inside the scroller is the
 * compensating fix the locks above already forbid on the horizontal axis, for the same reason: it
 * looks right at one size and drifts everywhere else, and it hides the cause.
 */
describe("agent card hover — shadow, never a lift", () => {
  it("the card's hover carries NO transform", () => {
    const hover = /\.aglist \.agl-facef \.agl-acard:hover \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(hover, "the hover rule is gone — the census below would be checking nothing").not.toBe("");
    expect(hover, "the hover lift came back. Inside a clipping scroller it pushes the card's top-left corner through the clip; the cast growing 6 → 8 is what reads as the lift.").not.toContain("transform");
    expect(hover, "the cast stopped growing, so the card no longer responds to the pointer at all").toContain("box-shadow: 8px 8px 0");
  });
});

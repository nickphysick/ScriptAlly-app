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

const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/shell/AppShell.tsx", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = css.indexOf(selector + " {");
  if (i === -1) return "";
  return css.slice(i, css.indexOf("}", i));
};

describe("agent list · the page column", () => {
  // v4 P1: the two numbers now come from the SHARED column tokens (pageHeader.css) so the Queries
  // header can sit in the same column. The values are unchanged — these locks therefore check the
  // token wiring AND that the tokens still carry 60px / 1240px, which is a strictly stronger
  // guarantee than the old literal match (it catches a drift at the definition too).
  const headerCss = readFileSync(new URL("../components/shell/pageHeader.css", import.meta.url), "utf8");

  it("the shared column tokens still carry the agent list's canonical geometry", () => {
    expect(
      headerCss,
      "--sa-col-gut moved off 60px — that silently re-guttters BOTH the agent list and the Queries header",
    ).toMatch(/--sa-col-gut:\s*60px/);
    expect(
      headerCss,
      "--sa-col-max moved off 1240px — that silently re-caps BOTH pages' content columns",
    ).toMatch(/--sa-col-max:\s*1240px/);
  });

  it("padding rides the page, the CAP rides the inner column — two elements, two jobs", () => {
    expect(
      block(".aglist .agl-page"),
      "the page padding changed — 28px top / the shared gutter / 48px bottom is the mockup's breathing room; merging it with the cap would tie the two together",
    ).toContain("padding: 28px var(--sa-col-gut) 48px");
    expect(
      block(".aglist .agl-inner"),
      "the content cap left the inner column — without it the grid stretches the full width of an ultrawide monitor instead of pooling the surplus as margin",
    ).toContain("max-width: var(--sa-col-max)");
    expect(
      block(".aglist .agl-inner"),
      "the inner column stopped centring — a capped column that doesn't centre just pins itself left and leaves all the surplus on one side",
    ).toContain("margin: 0 auto");
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
    // the reflow: two up, then one
    expect(css).toMatch(/@media \(max-width: 1100px\) \{ \.aglist \.agl-grid \{ grid-template-columns: repeat\(2, 1fr\); \} \}/);
    expect(css).toMatch(/@media \(max-width: 700px\) \{ \.aglist \.agl-grid \{ grid-template-columns: 1fr; \} \}/);
  });
});

/**
 * THE RIGHT-GUTTER CAUSE (diagnosed as checklist item 2 — viewport-anchored furniture).
 * `.sa-tltab` was moved to the capsule edge in an earlier pack; the help FAB was missed, and its
 * bare right:20 measured from the browser edge, overhanging the ground gutter on the right only.
 */
describe("the help FAB is RETIRED — help is a bar button now (top-bar rebuild)", () => {
  it("the floating FAB and its inline right-inset are gone, so it cannot mismeasure anything", () => {
    expect(shell).not.toContain('className="ashell-help-fab"');
    // it was one of the three suspects in the right-gutter bug; removing it removes the class
    const v2 = readFileSync(new URL("../components/shell/ShellV2.tsx", import.meta.url), "utf8");
    expect(v2).toContain('className="sv2-tbicon"');
  });
});


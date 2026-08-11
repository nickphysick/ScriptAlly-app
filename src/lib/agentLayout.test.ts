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
      /* ⚠️ THE TOP IS 14px, HALVED FROM 28 (Contact list pass). The workspace header now sits
         INSIDE this padding, so the top value stopped being breathing room above the content and
         became a band of empty paper above a header that is already generous. The gutter and the
         48px bottom are untouched — they gutter the CONTENT, which is a different job, and
         merging them with the cap would still tie the two together.
         ⚠️ RETARGETED, NOT RELAXED (band-tier full-bleed pass): the side value is now read through
         `--pg-gut` rather than straight from `--sa-col-gut`. That indirection is the POINT — the
         header's bleed reads the same token back to cancel it, so the rule spans the page while the
         content stays guttered. `--pg-gut` is still DEFINED as `var(--sa-col-gut)` on this rule, so
         the shared column token is still what sets the number. */
      /* ⚠️ THE BOTTOM IS 0, NOT 48 (amendment 9) — retargeted, not relaxed. The 48px moved INTO the
         scroller: below row 3 it would be fixed space the list could never scroll into, a permanent
         dead band at the foot of the page. */
      "the page padding changed — 14px top / the gutter token / 0 bottom, because the bottom gutter is the scroller's now",
    ).toContain("padding: 14px var(--pg-gut) 0");
    expect(
      block(".aglist .wpg-scroll"),
      "the bottom gutter left the scroller — the last card butts against the frame with nothing under it",
    ).toContain("padding-bottom: 48px");
    /* ⚠️ THE CAP MOVED UP A LEVEL, to the grid root, and that is a STRONGER guarantee: it governs
       plate, toolbar and cards at once, so the three cannot disagree. Capping the inner column alone
       left the chrome rows full width and made the alignment three rules hoping to match. */
    expect(
      block(".aglist .agl-wpg"),
      "the content cap left the grid root — without it the three rows stretch the full width of an ultrawide monitor instead of pooling the surplus as margin",
    ).toContain("max-width: var(--sa-col-max)");
    expect(
      block(".aglist .agl-wpg"),
      "the capped column stopped centring — it would pin left and leave all the surplus on one side",
    ).toContain("margin-inline: auto");
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


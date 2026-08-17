/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 1 locks — the shared header column, the wider workspace, and the
 * labelled list-card pills (ref design-refs/queries-hub-v4.html; the Guides view draws the
 * header column's edges).
 *
 * jsdom can measure none of this, so these lock the CAUSES the pixels follow from: that the
 * header block reads the shared column tokens (the same ones the agent list reads, so the two
 * pages' headers line up), that the workspace deliberately does NOT (it keeps its wider cap),
 * and that the list-card controls are labelled rather than icon-only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const f12 = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");
const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const shellComp = readFileSync(new URL("../components/shell/F12Shell.tsx", import.meta.url), "utf8");
/** The rule for `selector` itself — anchored to a line start, so a DESCENDANT rule
 *  (".qh-enter .f12-chips {") can never be mistaken for the base rule. */
const block = (selector: string): string => {
  const i = f12.indexOf("\n" + selector + " {");
  if (i === -1) return "";
  return f12.slice(i, f12.indexOf("}", i));
};

describe("Queries hub · the header block sits in the SHARED content column", () => {
  it("the toolbar is a PANE row, deliberately outside the shared column (P3)", () => {
    const ctl = block(".f12-ctl");
    expect(ctl, ".f12-ctl is missing").not.toBe("");
    expect(ctl, "the toolbar went back to being a page-width band").not.toContain("var(--sa-col-max)");
    expect(ctl, "it should close with a hairline inside the pane").toContain("border-bottom");
  });

  /* The header block = the page-header seat and the active-filter chips.
     ⚠️ .f12-ctl LEFT THIS SET in Query Centre P3, deliberately: the toolbar is a row inside the
     reading pane now — flush with the cards beneath it — not a page-width band straddling the
     list, so binding it to the shared column would be wrong. The header seat still reads the
     column, and that is what keeps Query Centre lining up with the agent list. */
  /* ⚠️ THE CAP HALF IS WITHDRAWN (header spec §1). These asserted `--sa-col-max` — a MAXIMUM
     width, and there are none anywhere in the workspace now: content is the window minus the
     content gutter, on every page, so Query Centre and the agent list line up by sharing the
     GUTTER rather than by sharing a cap. Asserting the cap would fail correctly and read as a
     regression.
     ⚠️ AND THE GUTTER HALF IS WITHDRAWN TOO, one pass later. It asserted that these rules read
     `--sa-col-gut` — "the thing still doing the aligning" — which was exactly backwards: the page
     sits inside `.wpg-scroll`, which already carries `padding-inline: var(--content-gutter)`, so
     naming the gutter again bought a SECOND one and made Query Centre's content 160px inset a
     side against every other page's 80. The lock was pinning the fault in place, and it read as
     correct because the alias resolved to the right token. Alignment is structural now: both the
     header row and the content are children of the same padded row.
     ⚠️ `.f12-hd2` IS GONE FROM THE LIST — the grid's header row replaced the element; the rule
     outlived the markup by a pass. */
  for (const sel of [".f12-chips"]) {
    it(`${sel} states no gutter and no cap of its own — the scroll row pays both`, () => {
      const rule = block(sel);
      expect(rule, `${sel} is missing from f12.css`).not.toBe("");
      expect(rule, `${sel} re-declared a side gutter — the scroll row already pays it, so the content insets twice`)
        .not.toContain("--sa-col-gut");
      const pad = /padding\s*:\s*([^;]*)/.exec(rule)?.[1]?.trim() ?? "";
      expect(["0 0 9px", "0"], `${sel}'s padding names a side value: "${pad}"`).toContain(pad);
      expect(
        rule,
        `${sel} took a max-width — widths are relationships now, and a cap here re-creates the centred column whose scrollbar ate the content`,
      ).not.toContain("max-width");
      expect(
        rule,
        `${sel} is back on the workspace cap — the header would run wider than every other page`,
      ).not.toContain("var(--maxw)");
    });
  }

  /* ⚠️ SUPERSEDED — and this one reverses a real decision, so it is recorded rather than deleted.
     The workspace USED to keep its own wider cap (--maxw 1520) against the header's narrower
     column, and that differential was deliberate: "exactly the ref's Guides view, not an
     accident". The Query Centre frame retires it. Once the workspace gained a visible HAIRLINE,
     the differential stopped reading as a considered width and started reading as a frame that
     misses the page's own margins — its edges ran to the sheet while the title sat 87px inside.
     Nick's call, on the rendered page: the frame's edges align with the title and the header
     buttons. A differential you can see the seam of is not the same object as one you can't.

     ⚠️ AMENDED AGAIN, and the amendment is the interesting half: sharing the header's column
     also inherited the header's CAP, so the inset stopped being the gutter and became half the
     leftover — 60px at a 1026px sheet, 87px at 1414, ~230px at 1700. A margin that grows with
     the window is not a margin, it is centring. So the cap is gone and the inset is a constant
     one gutter. THE COST, measured and accepted: past a 1360px sheet the header still caps
     while the frame does not, so the title sits INSIDE the frame's edge — 27px at 1414, 170px
     at 1700. Alignment at every width and a constant margin cannot both hold; the margin won. */
  /* ⚠️ THE FRAME STATES NO INSET OF ITS OWN, AND THAT REVERSES THIS CASE'S WHOLE PREMISE. It read
     "insets by exactly one --sa-col-gut a side, at EVERY width — the same token the header pads
     by, so the two track each other" — which was true of the token and false of the result. The
     page lives inside `.wpg-scroll`, which already carries `padding-inline: var(--content-gutter)`
     on all ten pages, so a second inset here put Query Centre's working area 80px narrower a side
     than every other page's. Naming the shared token is not the same as sharing the gutter.
     The tracking the old note wanted is now structural: the header row and this frame are children
     of the same padded row, so they share an edge without either stating a number.
     ⚠️ NO CAP, unchanged — a cap makes the margin a share of the surplus (60px at a 1026px sheet,
     ~230px at 1700, browser-measured). And no AUTO MARGINS: at `width: 100%` they resolve to zero,
     so they are merely dead — but a dead auto margin is how a cap returns unnoticed, since the
     centring it needs is already in place. */
  it("the WORKSPACE fills the scroll row — no second gutter, no cap, no auto margin", () => {
    /* ⚠️ COMMENT-STRIPPED. The rule's own explanatory note NAMES `--sa-col-gut` — it exists to say
       why the token is not read here — and the assertion matched the prose describing the retired
       token. Third time in this repo: `position: sticky` in a shell comment, `closeCreate()`
       quoted in a test, and now this. A rule about code is asserted against code. */
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const body = code(block(".f12-body"));
    expect(body, "the frame went back to its own wider cap").not.toContain("var(--maxw)");
    /* ⚠️ INVERTED BY §4. The old clause — "a cap turns the margin into a share of the surplus" —
       was an argument against capping while the shell owned the width; the cap is now the stated
       behaviour, and its margin being a share of the surplus is exactly what centring is. What
       survives is that the figure is the SHARED token the Dashboard reads, not one invented here:
       measured at 2560, both pages stop at 1660 with equal margins. */
    expect(body, "the cap is not the shared token").toContain("max-width: var(--work-max)");
    expect(body, "the frame invented a cap of its own").not.toMatch(/max-width:\s*\d/);
    expect(body, "the frame re-declared a side inset — the scroll row already pays the gutter")
      .not.toContain("--sa-col-gut");
    expect(body, "the frame stopped filling the row").toContain("width: 100%");
  });

  it("the action row right-aligns; the --listw spacer that locked it to the list pane is gone", () => {
    expect(block(".f12-zone-read")).toContain("justify-content: flex-end");
    expect(f12, "the retired left-zone rule is still in the stylesheet").not.toContain(".f12-zone-list {");
  });
});

describe("Queries hub · the list card's Filter / Sort are LABELLED pills", () => {
  it("both controls render through PillTrig, not the icon-only trigger", () => {
    expect(queries).toContain("<PillTrig");
    expect(queries, "an icon-only trigger came back to the list head").not.toContain("<IconTrig");
    expect(queries).toContain('label="Filter"');
    expect(queries).toContain('label="Sort"');
  });

  /* v5 P1 re-dressed these as COMPACT icon-only triggers (the v4 label + chevron are retired), so
     the search takes the rest of the row. The guarantees move with the dress: the trigger must
     still SAY what it is to a non-hovering user, and the count must still be visible.

     ⚠️ ONE BUTTON VOCABULARY (§1c) — and this case USED to demand the opposite. It asserted a 36px
     `border-radius: 999px` circle, which was true and was the fault: the kebab eight pixels away in
     the hero is a 9px-radius rounded square, so the page carried two icon-button shapes at two
     sizes. The page now states one, from one pair of tokens. The circle assertion is DELETED rather
     than loosened — left standing it would re-mint the divergence the moment anyone ran the suite. */
  it("PillTrig and the kebab are ONE shape, from one pair of tokens", () => {
    expect(shellComp).toContain("f12-pill");
    const pill = block(".f12-pill");
    const keb = block(".qc-kebab");
    expect(keb, "the kebab has no rule of its own — its size would come from its glyph").not.toBe("");
    for (const [name, r] of [["pill", pill], ["kebab", keb]] as const) {
      expect(r, `the ${name} restated a size instead of reading the token`).toContain("width: var(--f12-icon-btn)");
      expect(r, `the ${name} restated a size instead of reading the token`).toContain("height: var(--f12-icon-btn)");
      expect(r, `the ${name} left the shared radius — two icon-button shapes on one page`).toContain("border-radius: var(--r-md)");
    }
    /* ⚠️ WHOLE-STRING, NOT `block(".t-f12")`. There are TWO `.t-f12 {` rules in this stylesheet —
       this token and `--mono-tonal` — so a first-match slice reads whichever happens to come first
       and would silently start testing the other one the day they swap order. The repo has been
       caught by that shape twice already; a declaration this exact needs no slice at all. */
    expect(f12, "the size token is not declared").toContain("--f12-icon-btn: 34px");
    expect(pill, "the circle came back — it is what made the two controls read as two components").not.toContain("border-radius: 999px");
    expect(shellComp, "the v4 chevron is retired with the label").not.toContain("f12-cv");
  });

  it("dropping the label does NOT drop the naming — tooltip, aria-label and popover header all say it", () => {
    expect(shellComp, "no tooltip: an icon-only control the user must hover to identify").toContain("title={label}");
    expect(shellComp).toContain("aria-label={value ? `${label}: ${value}` : label}");
    // Each popover names itself in its own header, so the word survives for keyboard/touch users.
    expect(queries).toContain('title="Filter"');
    expect(queries).toContain('title="Sort"');
  });

  it("Filter carries a ringed count badge; Sort carries no marker at all", () => {
    const badge = block(".f12-pill .f12-pcount");
    expect(badge, "the count stopped being a corner dot").toContain("position: absolute");
    expect(badge, "the badge lost the card-coloured ring that seats it on the button").toContain("border: 1.5px solid var(--panel)");
    expect(badge, "the badge fill left the app's established burgundy").toContain("background: var(--burg)");
    // Sort passes no count — its state reads in the popover, by design.
    const sortTrig = queries.slice(queries.indexOf('label="Sort"') - 300, queries.indexOf('label="Sort"') + 300);
    expect(sortTrig, "Sort grew a count badge — its state belongs in the popover").not.toContain("count=");
  });
});

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
  // The header block = the page-header seat, the action row, and the active-filter chips.
  for (const sel of [".f12-hd2", ".f12-ctl", ".f12-chips"]) {
    it(`${sel} reads the shared column tokens, not the workspace cap`, () => {
      const rule = block(sel);
      expect(rule, `${sel} is missing from f12.css`).not.toBe("");
      expect(
        rule,
        `${sel} left the shared column — the Queries header would stop lining up with the agent list's`,
      ).toContain("var(--sa-col-max)");
      expect(rule, `${sel} lost the shared gutter`).toContain("var(--sa-col-gut)");
      expect(
        rule,
        `${sel} is back on the workspace cap — the header would run wider than the agent list's`,
      ).not.toContain("var(--maxw)");
    });
  }

  it("the WORKSPACE keeps its own wider cap — the differential is the point", () => {
    const body = block(".f12-body");
    expect(
      body,
      "the list + reading pane fell into the header column — the hub's workspace is deliberately wider (ref Guides view)",
    ).toContain("var(--maxw)");
    expect(body).not.toContain("var(--sa-col-max)");
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

  // v5 P1 re-dressed these as COMPACT icon-only circles (the v4 label + chevron are retired), so
  // the search takes the rest of the row. The guarantees move with the dress: the trigger must
  // still SAY what it is to a non-hovering user, and the count must still be visible.
  it("PillTrig is a 36px icon-only circle", () => {
    expect(shellComp).toContain("f12-pill");
    const pill = block(".f12-pill");
    expect(pill, "the compact trigger lost its square geometry").toContain("width: 36px");
    expect(pill).toContain("height: 36px");
    expect(pill, "an icon-only control must be circular, not a rounded rectangle").toContain("border-radius: 999px");
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Queries workspace ground (ref design-refs/qdb-header-modes.html — its white workspace, not
 * its header-collapse modes, which are NOT built).
 *
 * The hub's reading pane carried an inline `background: var(--paper)` — #faf6f0, a cream — which
 * made the one surface everything else sits on warmer than the equivalent surface on every other
 * page. It is REMOVED, not painted over: the pane now inherits .f12-pane's --panel like the list
 * card beside it. Browser-measured against Agents: #fffdfb vs #ffffff, a luminance difference of
 * 1.7/255 — indistinguishable at any size.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");

describe("the cream override is gone", () => {
  it("no inline --paper ground survives on the reading pane", () => {
    expect(queries, "the cream ground came back").not.toContain('background: "var(--paper)"');
  });

  it("the pane inherits the shared card surface rather than declaring its own", () => {
    const pane = css.slice(css.indexOf("\n.f12-pane {"), css.indexOf("}", css.indexOf("\n.f12-pane {")));
    expect(pane).toContain("background: var(--panel)");
  });
});

describe("the cards still read as raised against the lighter ground", () => {
  /* Ground and cards now share --panel, so the tonal step is gone and the EDGE does the work.
     If this ever needs strengthening the answer is the border or the shadow — never tinting the
     ground back to cream, which is the change this pass exists to undo. */
  it("every card keeps its hairline", () => {
    for (const sel of ["\n.f12-pane {", "\n.f12-card {", "\n.f12-hero {"]) {
      const rule = css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
      expect(rule, `${sel.trim()} lost its border`).toContain("border: 1px solid var(--line)");
    }
  });

  it("and the panes keep their shadow", () => {
    const pane = css.slice(css.indexOf("\n.f12-pane {"), css.indexOf("}", css.indexOf("\n.f12-pane {")));
    expect(pane).toContain("box-shadow: var(--sh-2)");
  });
});

/* ⚠️ RETIRED with the scrim (create-mode v2, Phase 1). This asserted that the lighter ground
   left focus mode's spotlight intact — a real check while the page darkened itself to focus.
   The whole scrim system is deleted: create mode now focuses by CHANGING THE LAYOUT (the list
   collapses to a rail and the pane takes the width), not by dimming what surrounds it. There is
   no overlay left for a ground change to interact with, so the check has no subject.
   The ground's own assertions above are untouched and still live. */

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
import { sliceBetween } from "../test/sliceBetween";
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
    /* ⚠️ `.f12-card`'s HAIRLINE IS A RING SINCE FIX PACK 7 §2 — same weight, same token, drawn as an
       `::after` overlay so it can surround a filled header instead of stopping where the fill
       begins. The clause here is "the edge does the work"; which property draws it is not the
       subject, and asserting the property would have failed on a card that still has its edge. */
    const ring = css.slice(css.indexOf("\n.f12-card::after {"), css.indexOf("}", css.indexOf("\n.f12-card::after {")));
    expect(ring, ".f12-card lost its hairline").toContain("inset 0 0 0 1px var(--line)");
    /* ⚠️ `.f12-hero` IS GONE (pairing pack §1) — traced to a rendered root in both directions and
       deleted, so the pairing card takes its place in this sweep. The clause is unchanged: every
       card-like surface keeps a hairline against the lighter ground. */
    const pane = css.slice(css.indexOf("\n.f12-pane {"), css.indexOf("}", css.indexOf("\n.f12-pane {")));
    expect(pane, ".f12-pane lost its border").toContain("border: 1px solid var(--line)");
    /* ⚠️ THE PAIRING CARD DRAWS ITS EDGE AS A RING TOO, and at 2px in its own sage — so the clause
       is "it has an edge", not "it has that border". Asserting the property here would have failed
       on a surface whose edge is more emphatic than the one being asked for. */
    const pring = css.slice(css.indexOf("\n.qc-pair::after {"), css.indexOf("}", css.indexOf("\n.qc-pair::after {")));
    expect(pring, ".qc-pair lost its edge").toContain("inset 0 0 0 2px var(--qc-card-border)");
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

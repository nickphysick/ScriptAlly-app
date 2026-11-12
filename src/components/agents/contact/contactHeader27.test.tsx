/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 — the header (rendered markup; this repo's unit tests have no DOM). The v26 header and the v27 one
 * both mount `ContactHealth26`, and List health must be the SAME block on both: same text, same hooks, same structure.
 * The only differences allowed are the ground (`data-ground`) and the ring's two colours, which the ref draws in the
 * light-ground tones of the same table.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactHeader26 } from "./ContactHeader26";
import { ContactHeader27, CL27_HEADER_ART } from "./ContactHeader27";
import { RING_TONES } from "../../../lib/contactV256";

const noop = () => {};
const figures = { n: 41, q: 22, y: 5 };
const v26 = (health: { pct: number; gaps: number } | null) => renderToStaticMarkup(
  <ContactHeader26 loading={false} figures={figures} health={health} onAdd={noop} onDiscover={noop} onOpenHealth={noop} onShowWho={noop} />);
const v27 = (health: { pct: number; gaps: number } | null, f: { n: number; q: number; y: number } = figures) => renderToStaticMarkup(
  <ContactHeader27 loading={false} figures={f} health={health} onAdd={noop} onDiscover={noop} onOpenHealth={noop} onShowWho={noop} onNotQueried={noop} />);

/** the List health block's markup, the ground and the two stroke colours taken out */
function healthBlock(html: string): string {
  const a = html.indexOf('<div class="cl26-health"');
  expect(a, "the List health block is rendered").toBeGreaterThan(-1);
  /* the block is the last thing in both headers: it runs to the header's own closing tags */
  const b = html.lastIndexOf("</header>");
  return html.slice(a, b)
    .replace(/ data-ground="[a-z]+"/, "")
    .replace(/stroke:#[0-9a-f]{6}|stroke:rgba\([^)]*\)/gi, "stroke:X")
    .replace(/--arc:#[0-9a-f]{6}/gi, "--arc:X")
    .replace(/(<\/div>)+$/, "");
}

describe("v27 — List health is v26's block", () => {
  for (const h of [{ pct: 86, gaps: 29 }, { pct: 64, gaps: 1 }, { pct: 100, gaps: 0 }, null]) {
    it(`identical text, hooks and structure (${h ? `${h.pct}% · ${h.gaps}` : "loading"})`, () => {
      expect(healthBlock(v27(h))).toBe(healthBlock(v26(h)));
    });
  }
  it("its hooks are all there", () => {
    const html = v27({ pct: 86, gaps: 29 });
    for (const k of ["health", "ring", "track", "arc", "archivist", "pct", "missing", "open", "who"]) expect(html).toContain(`data-cl26="${k}"`);
    expect(html).toContain("List health");
    expect(html).toContain("<em>29</em> details missing");
    expect(html).toContain("Show me who →");
  });
  /* re-pointed (principles v2): the light ground is the brand pair at every score, no longer RING_TONES' light tones */
  it("on the light ground the ring is navy on soft pink at any score; v26's navy panel keeps its own", () => {
    for (const pct of [44, 72, 86]) {
      expect(v27({ pct, gaps: 3 })).toContain("stroke:#2a3a52");
      expect(v27({ pct, gaps: 3 })).toContain("stroke:#ecc0ae");
      expect(v27({ pct, gaps: 3 })).not.toContain(`stroke:${RING_TONES.good.light.arc}`);
    }
    expect(v26({ pct: 86, gaps: 3 })).toContain(`stroke:${RING_TONES.good.navy.arc}`);
  });
});

describe("v27 — the header's content (header v2)", () => {
  const html = v27({ pct: 86, gaps: 29 });
  it("CLH2-2 · the h1 is the count on file; the subheader is nq as a button onto the filter", () => {
    expect(html).toContain('data-clp="headline">41 agents on file</h1>');
    expect(html).toMatch(/<p class="clh2-sub" data-clh2="sub" data-link=""><button type="button" class="clh2-nq" data-clh2="notq">19 not yet queried<\/button><\/p>/);
    expect(html).not.toContain('data-cl27="for"');
  });
  it("CLH2-2 · all queried: the subheader is plain text, not a control", () => {
    const all = v27({ pct: 86, gaps: 29 }, { n: 17, q: 17, y: 2 });
    expect(all).toContain('<p class="clh2-sub" data-clh2="sub">All of them queried</p>');
    expect(all).not.toContain('data-clh2="notq"');
  });
  /** the header's own markup, List health taken out (its block is the header's last column) */
  const own = (x: string) => x.slice(0, x.indexOf('<div class="qc1531-rc'));
  it("CLH2-3 · the populated header has exactly one button in its action row; no 'need you', no 'Discover agents'", () => {
    for (const f of [figures, { n: 17, q: 17, y: 0 }]) {
      const x = v27({ pct: 86, gaps: 29 }, f);
      const acts = x.slice(x.indexOf('<div class="qc1531-acts">'), x.indexOf('<div class="qc1531-rc'));
      expect((acts.match(/<button/g) ?? []).length).toBe(1);
      expect(acts).toMatch(/data-cl27="add"[^>]*>\+ Add an agent</);
      expect(own(x)).not.toMatch(/need you|needs you/);
      expect(own(x)).not.toContain("Discover agents");
    }
  });
  it("day one is unchanged: its sentence, its words beneath, and Discover agents beside Add", () => {
    const d1 = v27({ pct: 40, gaps: 3 }, { n: 2, q: 0, y: 0 });
    expect(d1).toContain('data-clp="headline">2 agents so far. Neither queried yet.</h1>');
    expect(d1).toContain('<span class="clp-under">Add a few more and QueryHawk can start suggesting who to query next.</span>');
    expect(d1).toMatch(/class="qc1531-b qc1531-b--g" data-cl26="discover" data-cl24="discover"[^>]*>Discover agents</);
  });
  it("the drawing is the binoculars bird (one constant), 160 wide", () => {
    expect(CL27_HEADER_ART).toBe("/images/contact/discover-binoculars-bird.webp");
    expect(html).toContain(`src="${CL27_HEADER_ART}" alt="" width="160"`);
  });
  it("the add button keeps every hook the v26 one carried, in the Query Centre header's styles", () => {
    expect(html).toMatch(/class="qc1531-b qc1531-b--n" data-cl26="add" data-cl24="add" data-cl17="add"[^>]*>\+ Add an agent</);
  });
  it("the h1 keeps data-page-title (the folder tab and the page guide read it)", () => {
    expect(html).toMatch(/<h1 class="qc1531-t clp-t" data-page-title="true"/);
  });
});

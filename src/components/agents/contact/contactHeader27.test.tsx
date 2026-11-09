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
import { ContactHeader27, CL27_HEADER_ART, onFileTitle } from "./ContactHeader27";
import { RING_TONES } from "../../../lib/contactV256";

const noop = () => {};
const figures = { n: 41, q: 22, y: 5 };
const v26 = (health: { pct: number; gaps: number } | null) => renderToStaticMarkup(
  <ContactHeader26 loading={false} figures={figures} health={health} onAdd={noop} onDiscover={noop} onOpenHealth={noop} onShowWho={noop} />);
const v27 = (health: { pct: number; gaps: number } | null) => renderToStaticMarkup(
  <ContactHeader27 loading={false} figures={figures} health={health} onAdd={noop} onDiscover={noop} onOpenHealth={noop} onShowWho={noop} />);

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
  it("on the light ground the ring takes RING_TONES' light tones (the ref's); v26's navy panel keeps its own", () => {
    expect(v27({ pct: 86, gaps: 3 })).toContain(`stroke:${RING_TONES.good.light.arc}`);
    expect(v27({ pct: 86, gaps: 3 })).toContain(`stroke:${RING_TONES.good.light.track}`);
    expect(v26({ pct: 86, gaps: 3 })).toContain(`stroke:${RING_TONES.good.navy.arc}`);
  });
});

describe("v27 — the header's content", () => {
  const html = v27({ pct: 86, gaps: 29 });
  it("the title and the rule-flanked line; the old sentence is gone", () => {
    expect(onFileTitle(41)).toBe("41 agents on file");
    expect(onFileTitle(1)).toBe("1 agent on file");
    expect(html).toContain(">41 agents on file</h1>");
    expect(html).toMatch(/<p class="qc1531-for" data-cl27="for"><i aria-hidden="true"><\/i><span><em>you’ve queried<\/em> 22<\/span><i aria-hidden="true"><\/i><\/p>/);
    expect(html).not.toContain("waiting on you");
  });
  it("the drawing is the binoculars bird (one constant)", () => {
    expect(CL27_HEADER_ART).toBe("/images/contact/discover-binoculars-bird.webp");
    expect(html).toContain(`src="${CL27_HEADER_ART}"`);
  });
  it("the buttons keep every hook the v26 ones carried, in the Query Centre header's styles", () => {
    expect(html).toMatch(/class="qc1531-b qc1531-b--n" data-cl26="add" data-cl24="add" data-cl17="add"[^>]*>\+ Add an agent</);
    expect(html).toMatch(/class="qc1531-b qc1531-b--g" data-cl26="discover" data-cl24="discover"[^>]*>Discover agents</);
  });
  it("the h1 keeps data-page-title (the folder tab and the page guide read it)", () => {
    expect(html).toMatch(/<h1 class="qc1531-t" data-page-title="true"/);
  });
});

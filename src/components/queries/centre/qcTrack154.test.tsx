/**
 * Query Centre v154 — "Draw the journey" on the card's track: one status label, under the current step only, shown on
 * hover or focus of the track after the draw (0.45s), at once with reduced motion; the connectors draw left to right,
 * the reached steps pop in turn and the current one pulses once.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { card154, row154 } from "./qc154.fixture";

const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
const rule = (sel: string) => { const i = css.indexOf(sel); return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1); };

describe("draw the journey", () => {
  it("hovering the track shows exactly one status label, and it is under the current step", () => {
    for (const [st, court, word] of [[QueryStatus.QUERIED, "agent", "Queried"], [QueryStatus.FULL_REQUESTED, "you", "Full requested"], [QueryStatus.OFFER, "offer", "Offer"]] as const) {
      const h = card154(row154(st, court));
      const labels = h.match(/<span class="qc154-thl"[^>]*>[^<]*<\/span>/g) ?? [];
      expect(labels, st).toHaveLength(1);
      expect(labels[0]).toContain(`>${word}<`);
      /* inside the current step's own element */
      const cur = h.match(/<span class="qc153-nd qc153-nd--cur"[\s\S]*?<\/span><\/span>/)?.[0] ?? "";
      expect(cur, st).toContain('class="qc154-thl"');
    }
    /* hidden at rest; shown on the track's hover or keyboard focus, after the draw */
    expect(rule(".qc154-thl {")).toMatch(/opacity:\s*0/);
    const on = rule(".qc154-trkw:hover .qc154-thl, .qc154-trkw:focus-visible .qc154-thl {");
    expect(on).toMatch(/opacity:\s*1/);
    expect(on).toMatch(/transition-delay:\s*0\.45s/);
  });

  it("connectors draw in turn, reached steps pop in turn, the current step pulses once", () => {
    expect(css).toMatch(/@keyframes qc154-draw\s*\{\s*from\s*\{\s*transform:\s*scaleX\(0\)/);
    expect(rule(".qc154-trkw:hover .qc153-ln--done, .qc154-trkw:focus-visible .qc153-ln--done {")).toMatch(/animation:\s*qc154-draw 0\.22s ease-out both;\s*animation-delay:\s*calc\(var\(--k\) \* 0\.18s\)/);
    expect(rule(".qc154-trkw:hover .qc153-nd:not(.qc153-nd--fut), .qc154-trkw:focus-visible .qc153-nd:not(.qc153-nd--fut) {")).toMatch(/qc154-pop 0\.3s ease-out both/);
    const cur = rule(".qc154-trkw:hover .qc153-nd--cur, .qc154-trkw:focus-visible .qc153-nd--cur {");
    expect(cur).toMatch(/qc154-ring 1s ease-out 1\b/);
  });

  it("reduced motion: no draw and no pulse, and the label shows at once", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    const rm = css.slice(i);
    expect(i).toBeGreaterThan(0);
    expect(rm).toMatch(/\.qc154-trkw \.qc153-ln,\s*\.qc154-trkw \.qc153-nd\s*\{[^}]*animation:\s*none\s*!important/);
    expect(rm).toMatch(/\.qc154-thl\s*\{[^}]*transition:\s*none\s*!important;[^}]*transition-delay:\s*0s\s*!important/);
  });
});

/**
 * Query Centre v154 — "Draw the journey" on the card's track (its status label under the current step retired by
 * Plumage colours v2): the connectors draw left to right,
 * the reached steps pop in turn and the current one pulses once.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { card154, row154 } from "./qc154.fixture";

const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
const rule = (sel: string) => { const i = css.indexOf(sel); return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1); };

describe("draw the journey", () => {
  /* Plumage colours v2 — v154's status label under the current step is retired (the band's label replaces it) */
  it("the track draws no status label any more, on any card", () => {
    for (const [st, court] of [[QueryStatus.QUERIED, "agent"], [QueryStatus.FULL_REQUESTED, "you"], [QueryStatus.OFFER, "offer"]] as const) {
      expect(card154(row154(st, court)), st).not.toContain("qc154-thl");
    }
    expect(css).not.toContain(".qc154-thl");
  });

  it("connectors draw in turn, reached steps pop in turn, the current step pulses once", () => {
    expect(css).toMatch(/@keyframes qc154-draw\s*\{\s*from\s*\{\s*transform:\s*scaleX\(0\)/);
    expect(rule(".qc154-trkw:hover .qc153-ln--done, .qc154-trkw:focus-visible .qc153-ln--done {")).toMatch(/animation:\s*qc154-draw 0\.22s ease-out both;\s*animation-delay:\s*calc\(var\(--k\) \* 0\.18s\)/);
    expect(rule(".qc154-trkw:hover .qc153-nd:not(.qc153-nd--fut), .qc154-trkw:focus-visible .qc153-nd:not(.qc153-nd--fut) {")).toMatch(/qc154-pop 0\.3s ease-out both/);
    const cur = rule(".qc154-trkw:hover .qc153-nd--cur, .qc154-trkw:focus-visible .qc153-nd--cur {");
    expect(cur).toMatch(/qc154-ring 1s ease-out 1\b/);
  });

  it("reduced motion: no draw and no pulse", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    const rm = css.slice(i);
    expect(i).toBeGreaterThan(0);
    expect(rm).toMatch(/\.qc154-trkw \.qc153-ln,\s*\.qc154-trkw \.qc153-nd\s*\{[^}]*animation:\s*none\s*!important/);
  });
});

/**
 * Query Centre v153.2 — the open ring's middle: the number still in play (sent less passed or closed).
 * v153.4 — the ring alone: no legend, no counts on the segments, no tooltip; each segment a focusable button with an
 * annotation shown only on hover or focus. (Hover and focus are measured in tests/e2e/qc1534.measure.ts P4.)
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyQc138Filters } from "../../../lib/qc138";
import type { RingCounts } from "../../../lib/qc1531";
import { QcStageRing1531 } from "./QcStageRing1531";

const html = (counts: RingCounts | null) =>
  renderToStaticMarkup(<QcStageRing1531 counts={counts} filters={emptyQc138Filters()} onFilters={() => {}} />);
const mid = (h: string) => /data-qc1531="mid"[^>]*>([^<]*)</.exec(h)?.[1] ?? null;

describe("the open ring", () => {
  it("the middle is the number still in play: sent less passed or closed", () => {
    const h = html({ wait: 12, partial: 5, full: 4, offer: 1, closed: 4 });
    expect(mid(h)).toBe("22");
    expect(h).toContain("still in play");
    expect(h).toContain("26 sent");
  });
  it("nothing sent: 0 in the middle, 'Nothing sent yet', one full track", () => {
    const h = html({ wait: 0, partial: 0, full: 0, offer: 0, closed: 0 });
    expect(mid(h)).toBe("0");
    expect(h).toContain("Nothing sent yet");
    expect(h).toContain('data-qc1531="track"');
  });
  it("no card, no navy bar, no post pile", () => {
    const h = html({ wait: 1, partial: 0, full: 0, offer: 0, closed: 0 });
    expect(h).not.toContain("qc1531-rh");
    expect(h).not.toContain("qc-post-pile");
    expect(h).not.toContain('data-qc1531="pile"');
  });
});

describe("v153.4 · the ring alone", () => {
  const full = { wait: 12, partial: 5, full: 4, offer: 1, closed: 4 };
  it("no legend, no legend heading, no counts on the segments, no tooltip", () => {
    const h = html(full);
    expect(h).not.toContain('data-qc1531="legend"');
    expect(h).not.toContain('data-qc1531="lg-head"');
    expect(h).not.toContain("Where they are</h2>");
    expect(h).not.toContain('data-qc1531="seg-n"');
    expect(h).not.toContain('data-qc1531="tip"');
  });
  it("each drawn segment is a focusable button named \"Partial requested, 5 of 26\"", () => {
    const h = html(full);
    const segs = [...h.matchAll(/<path[^>]*data-qc1531="seg"[^>]*>/g)].map((m) => m[0]);
    expect(segs).toHaveLength(5);
    for (const s of segs) { expect(s).toContain('role="button"'); expect(s).toContain('tabindex="0"'); expect(s).toContain('aria-pressed="false"'); }
    expect(h).toContain('aria-label="Partial requested, 5 of 26"');
    expect(h).toContain('aria-label="Passed or closed, 4 of 26"');
  });
  it("one annotation per segment, none shown at rest, each with its count and short name", () => {
    const h = html(full);
    const anns = [...h.matchAll(/<g class="qc1534-ann[^"]*"[^>]*data-qc1534="ann"[^>]*data-k="(\w+)"[\s\S]*?<\/g>/g)];
    expect(anns.map((a) => a[1])).toEqual(["wait", "partial", "full", "offer", "closed"]);
    expect(h).not.toContain("qc1534-ann is-on");
    expect(anns[0][0]).toMatch(/>12<[\s\S]*>Waiting</);
    expect(anns[4][0]).toContain(">Passed or closed<");
  });
  it("a zero bucket draws no segment and no annotation", () => {
    const h = html({ wait: 3, partial: 0, full: 0, offer: 0, closed: 1 });
    expect((h.match(/data-qc1534="ann"/g) ?? []).length).toBe(2);
    expect(h).not.toContain('data-k="partial"');
  });
});

/**
 * Query Centre v153.2 — the open ring's middle: the number still in play (sent less passed or closed), and the
 * legend heading's "M sent".
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
    expect(h).toMatch(/data-qc1531="lg-head"[\s\S]*Where they are[\s\S]*26 sent/);
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

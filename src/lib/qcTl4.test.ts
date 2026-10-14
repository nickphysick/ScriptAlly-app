/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { tl4Layout, tl4Stops, tl4Xs, TL4 } from "./qcTl4";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const NOW = at(2026, 10, 8);
/* a stub measure: ~7px a character, a little more for the larger faces */
const measure = (t: string, f: string) => t.length * (f === "name" ? 7.5 : f === "note" ? 6 : 6.6);
const sophie = () => tl4Stops([
  { name: "Query sent", ms: at(2026, 8, 22), status: "Queried" },
  { name: "Partial requested", ms: at(2026, 8, 22) + 3_600_000, status: "Partial Requested" },
  { name: "Partial sent", ms: at(2026, 9, 21), status: "Partial Sent" },
], { due: at(2026, 11, 2), now: NOW, closed: false, yours: false });
const tom = () => tl4Stops([
  { name: "Query sent", ms: at(2024, 3, 3), status: "Queried" },
  { name: "Partial requested", ms: at(2024, 4, 10), status: "Partial Requested" },
  { name: "Partial sent", ms: at(2024, 4, 12), status: "Partial Sent" },
  { name: "Offer", ms: at(2026, 7, 17), status: "Offer" },
], { due: at(2026, 7, 31), now: NOW, closed: false, yours: true });

describe("v138.4 · one positioned track", () => {
  it("merges a same day into one stop showing the later stage, and notes it", () => {
    const S = sophie();
    expect(S.map((s) => s.kind)).toEqual(["ev", "ev", "today", "due"]);
    expect(S[0].status).toBe("Partial Requested");
    const l = tl4Layout(S, 900, measure, NOW).labels.find((x) => x.i === 0)!;
    expect(l.name).toBe("Partial requested");
    expect(l.notes).toEqual(["+1 same day"]);
  });
  it("places markers at their true dates", () => {
    const S = sophie(), xs = tl4Layout(S, 900, measure, NOW).xs;
    const r = (xs[2] - xs[1]) / (xs[3] - xs[1]);
    const t = (S[2].ms - S[1].ms) / (S[3].ms - S[1].ms);
    expect(Math.abs(r - t)).toBeLessThan(0.03);
  });
  it("keeps markers 30px apart, taking the space from the longest gap", () => {
    const xs = tl4Xs([at(2024, 3, 3), at(2024, 4, 10), at(2024, 4, 12), at(2026, 7, 17), at(2026, 7, 31), NOW], 700);
    for (let i = 1; i < xs.length; i += 1) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(TL4.MIN - 0.01);
    expect(xs[0]).toBeCloseTo(TL4.PAD);
    expect(xs[xs.length - 1]).toBeCloseTo(700 - TL4.PAD);
  });
  it("folds an older event that does not fit into its nearest neighbour: '+1 earlier'", () => {
    const lay = tl4Layout(tom(), 700, measure, NOW);
    expect(lay.labels.some((l) => l.notes.includes("+1 earlier"))).toBe(true);
  });
  it("never lets two labels in one lane overlap, and keeps them inside the track", () => {
    for (const w of [520, 700, 900, 1100]) for (const S of [sophie(), tom()]) {
      const L = tl4Layout(S, w, measure, NOW).labels;
      for (const a of L) { expect(a.L).toBeGreaterThanOrEqual(0); expect(a.R).toBeLessThanOrEqual(w); }
      for (const a of L) for (const b of L) if (a !== b && a.lane === b.lane) expect(a.R <= b.L || b.R <= a.L).toBe(true);
    }
  });
  it("colours only now: past bars grey, the current stretch by court, overdue hatched", () => {
    const bars = tl4Layout(tom(), 900, measure, NOW).bars.map((b) => `${b.cls}${b.court ? `:${b.court}` : ""}`);
    expect(bars).toEqual(["past", "past", "past", "past", "over"]);
    const s = tl4Layout(sophie(), 900, measure, NOW).bars.map((b) => `${b.cls}${b.court ? `:${b.court}` : ""}`);
    expect(s).toEqual(["past", "live:agt", "ahead"]);
  });
  it("a closed query ends at its closing event, with no Today", () => {
    const S = tl4Stops([{ name: "Query sent", ms: at(2026, 8, 20), status: "Queried" }, { name: "Passed", ms: at(2026, 10, 5), status: "Rejected" }], { due: null, now: NOW, closed: true, yours: false });
    expect(S.map((x) => x.kind)).toEqual(["ev", "ev"]);
    expect(S[1].glyph).toBe("cl");
  });
});

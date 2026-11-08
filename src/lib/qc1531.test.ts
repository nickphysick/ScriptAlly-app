/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 — the stage ring's buckets and its filter toggle (phase 1), the policy words and the
 * materials chips (phase 3).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { emptyQc138Filters } from "./qc138";
import { STAND_ROWS, standOn, toggleStand } from "./qc140";
import { RING_BUCKETS, bucketOf, ringArcs, ringCounts, ringInPlay, ringOn, ringTotal, toggleRing } from "./qc1531";

const ALL = Object.values(QueryStatus) as QueryStatus[];

describe("the stage ring's buckets", () => {
  it("every status lands in exactly one bucket", () => {
    for (const s of ALL) {
      const homes = RING_BUCKETS.filter((b) => b.statuses.includes(s)).map((b) => b.key);
      expect(homes, `${s} is in ${homes.length} buckets`).toHaveLength(1);
      expect(bucketOf(s)).toBe(homes[0]);
    }
  });

  it("the buckets sum to the total, whatever the mix", () => {
    const mix = [...ALL, ...ALL, QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.REJECTED];
    const c = ringCounts(mix);
    expect(ringTotal(c)).toBe(mix.length);
    expect(ringInPlay(c)).toBe(mix.length - c.closed);
  });

  it("five buckets, in the ref's order", () => {
    expect(RING_BUCKETS.map((b) => b.label)).toEqual(["Waiting to hear", "Partial requested", "Full requested", "Offer", "Passed or closed"]);
  });

  it("a zero bucket draws nothing, and one bucket alone is the whole ring", () => {
    expect(ringArcs(ringCounts([]))).toEqual([]);
    const one = ringArcs(ringCounts([QueryStatus.OFFER, QueryStatus.SIGNED]));
    expect(one).toHaveLength(1);
    expect(one[0].full).toBe(true);
    const two = ringArcs(ringCounts([QueryStatus.QUERIED, QueryStatus.OFFER]));
    expect(two.map((a) => a.key)).toEqual(["wait", "offer"]);
  });
});

describe("a ring click is the rail's stage filter", () => {
  it("toggles exactly the statuses the rail's stand rows toggle", () => {
    for (const b of RING_BUCKETS) {
      const viaRing = toggleRing(emptyQc138Filters(), b.key);
      /* the same statuses through the rail's rows (and Withdrawn, which has no row of its own) */
      let viaRail = emptyQc138Filters();
      for (const row of STAND_ROWS) if (row.statuses.every((s) => b.statuses.includes(s))) viaRail = toggleStand(viaRail, row);
      const left = b.statuses.filter((s) => !viaRail.stages.includes(s));
      viaRail = { ...viaRail, stages: [...viaRail.stages, ...left] };
      expect([...viaRing.stages].sort(), b.key).toEqual([...viaRail.stages].sort());
      expect(ringOn(viaRing, b.key)).toBe(true);
    }
  });

  it("the rail shows it on, and a second click clears it", () => {
    const on = toggleRing(emptyQc138Filters(), "partial");
    const pr = STAND_ROWS.find((r) => r.key === "pr")!, ps = STAND_ROWS.find((r) => r.key === "ps")!;
    expect(standOn(on, pr) && standOn(on, ps)).toBe(true);
    const off = toggleRing(on, "partial");
    expect(off.stages).toEqual([]);
    expect(ringOn(off, "partial")).toBe(false);
  });

  it("leaves the rest of the filters alone", () => {
    const f = { ...emptyQc138Filters(), you: true, stages: [QueryStatus.OFFER] };
    const g = toggleRing(f, "wait");
    expect(g.you).toBe(true);
    expect(g.stages).toContain(QueryStatus.OFFER);
    expect(g.stages).toContain(QueryStatus.QUERIED);
  });
});

import { policyWords, slipMaterials } from "./qc1531";

describe("their policy, in words", () => {
  it("replies to everyone, with and without a stated window", () => {
    expect(policyWords({ noResponseMeansNo: false, responseTimeWeeks: 6 })).toEqual({ value: "Replies to everyone", line: "usually within 6 weeks" });
    expect(policyWords({ noResponseMeansNo: false })).toEqual({ value: "Replies to everyone", line: null });
  });
  it("no reply means no, with and without a stated window", () => {
    expect(policyWords({ noResponseMeansNo: true, responseTimeWeeks: 8 })).toEqual({ value: "No reply means no", line: "silence after 8 weeks" });
    expect(policyWords({ noResponseMeansNo: true, responseTimeWeeks: 0 })).toEqual({ value: "No reply means no", line: null });
  });
  it("one week is singular", () => {
    expect(policyWords({ noResponseMeansNo: false, responseTimeWeeks: 1 })?.line).toBe("usually within 1 week");
  });
  it("no policy at all is a dash with no line — never a guess", () => {
    expect(policyWords(null)).toEqual({ value: "—", line: null });
    expect(policyWords({ responseTimeWeeks: 6 })).toEqual({ value: "—", line: null });
  });
});

/* "Query letter" is the stored token; materials.ts's one display map shows it as "Covering letter" (UK copy) */
describe("the materials strip", () => {
  it("a package only: no chips, just the package", () => {
    expect(slipMaterials({}, QueryStatus.QUERIED, "Spring round")).toEqual({ chips: [], pkg: "Spring round" });
  });
  it("a partial asked: what went with the query, then the partial as a dashed 'asked' chip", () => {
    const m = slipMaterials({ materialsWanted: ["Query letter", "Synopsis"], materialsRequestedType: "pages", materialsRequestedQuantity: 50 }, QueryStatus.PARTIAL_REQUESTED, "Autumn round")!;
    expect(m.chips).toEqual([{ name: "Covering letter", asked: false }, { name: "Synopsis", asked: false }, { name: "First 50 pages", asked: true }]);
    expect(m.pkg).toBe("Autumn round");
  });
  it("a partial sent: the same chip, solid", () => {
    const m = slipMaterials({ materialsWanted: ["Query letter"], materialsRequestedType: "pages", materialsRequestedQuantity: 50, partialSentDate: "2026-09-01" }, QueryStatus.PARTIAL_SENT, null)!;
    expect(m.chips).toEqual([{ name: "Covering letter", asked: false }, { name: "First 50 pages", asked: false }]);
  });
  it("a full asked after a partial went: the partial solid, the full dashed", () => {
    const m = slipMaterials({ materialsRequestedType: "pages", materialsRequestedQuantity: 50, partialSentDate: "2026-09-01" }, QueryStatus.FULL_REQUESTED, null)!;
    expect(m.chips).toEqual([{ name: "First 50 pages", asked: false }, { name: "Full manuscript", asked: true }]);
  });
  it("nothing recorded and no package: the strip is left out", () => {
    expect(slipMaterials({}, QueryStatus.QUERIED, null)).toBeNull();
    expect(slipMaterials({ materialsWanted: [] }, QueryStatus.REJECTED, "  ")).toBeNull();
  });
});

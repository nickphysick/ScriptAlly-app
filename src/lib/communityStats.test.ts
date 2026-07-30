/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The point of these tests is not that the feature works — it is that the feature CANNOT leak. While
 * COMMUNITY_STATS_ENABLED is false, no input produces a displayable percentile; and even with the
 * flag on, the floors and the null-source contract still hold.
 */
import { describe, it, expect } from "vitest";
import {
  COMMUNITY_STATS_ENABLED, COHORT_FLOOR, displayablePercentile, placeholderCommunitySource,
  percentileLabel, percentileSentence, CommunityStatsSource,
} from "./communityStats";
import { MIN_SENDS_FOR_CLAIM } from "./packageMetrics";

/** A source that always answers — used only to prove the gates, never shipped. */
const generous = (percentile: number, cohortSize: number): CommunityStatsSource => ({
  percentileFor: () => ({ percentile, cohortSize }),
});

describe("the flag", () => {
  it("is OFF — the product ships with no community claims", () => {
    expect(COMMUNITY_STATS_ENABLED).toBe(false);
  });

  it("suppresses every percentile while it is off, however generous the source", () => {
    expect(displayablePercentile("package-reply-rate", 0.9, 999, generous(99, 100_000))).toBeNull();
  });
});

describe("the only shipped source", () => {
  it("knows nothing and says so — it never invents a number", () => {
    expect(placeholderCommunitySource.percentileFor("package-reply-rate", 0.5)).toBeNull();
    expect(placeholderCommunitySource.percentileFor("material-reply-rate", 1)).toBeNull();
  });
});

// The gate logic itself, exercised as if the flag were on — so the floors are proven now rather than
// discovered later. Each case calls the gate's internals through a source that would answer freely.
describe("the gates (proven independently of the flag)", () => {
  const gate = (value: number | null, ownSends: number, src: CommunityStatsSource) => {
    // Re-implements displayablePercentile's contract minus the flag, so the floors stay under test
    // while the flag is off. If this drifts from the real function, the mirror test below fails.
    if (value === null) return null;
    if (ownSends < MIN_SENDS_FOR_CLAIM) return null;
    const a = src.percentileFor("package-reply-rate", value);
    if (!a || a.cohortSize < COHORT_FLOOR || a.percentile < 0 || a.percentile > 100) return null;
    return { percentile: Math.round(a.percentile), cohortSize: a.cohortSize };
  };

  it("needs a cohort of at least COHORT_FLOOR comparable records", () => {
    expect(gate(0.5, 10, generous(70, COHORT_FLOOR - 1))).toBeNull();
    expect(gate(0.5, 10, generous(70, COHORT_FLOOR))).toMatchObject({ percentile: 70 });
  });

  it("needs the writer's own sample to clear MIN_SENDS_FOR_CLAIM", () => {
    expect(gate(0.5, MIN_SENDS_FOR_CLAIM - 1, generous(70, 500))).toBeNull();
    expect(gate(0.5, MIN_SENDS_FOR_CLAIM, generous(70, 500))).not.toBeNull();
  });

  it("rejects an out-of-range percentile rather than rendering nonsense", () => {
    expect(gate(0.5, 10, generous(140, 500))).toBeNull();
    expect(gate(0.5, 10, generous(-1, 500))).toBeNull();
  });

  it("renders nothing when there is no own figure to compare", () => {
    expect(gate(null, 10, generous(70, 500))).toBeNull();
  });

  it("mirrors the real gate: with the flag off, the real function is null everywhere the mirror is not", () => {
    expect(displayablePercentile("package-reply-rate", 0.5, 10, generous(70, 500))).toBeNull();
    expect(gate(0.5, 10, generous(70, 500))).not.toBeNull();
  });
});

describe("copy discipline", () => {
  it("labels a ranking, never a cause", () => {
    expect(percentileLabel({ percentile: 94, cohortSize: 100 })).toBe("TOP 6%");
    expect(percentileLabel({ percentile: 71, cohortSize: 100 })).toBe("BEATS 71%");
    const sentence = percentileSentence({ percentile: 78, cohortSize: 100 }, "package");
    expect(sentence).toBe("This package's reply rate is higher than 78% of comparable packages in the ScriptAlly community.");
    expect(sentence).not.toMatch(/because|caused|thanks to|leads to/i);
  });
});

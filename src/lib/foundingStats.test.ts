/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB93 B3 — the client's reading of `foundingStats/{uid}`, and its tier table held equal to the server's.
 */
import { describe, it, expect } from "vitest";
import { TIERS, ZERO_STATS, ringFraction, statsFrom, tierIndex } from "./foundingStats";
import { TIERS as SERVER_TIERS } from "../../functions/src/foundingContributions";

describe("the tier table", () => {
  it("is the server's: same keys, names and minimums, in order", () => {
    expect(TIERS.map(({ key, name, min }) => ({ key, name, min }))).toEqual(SERVER_TIERS.map(({ key, name, min }) => ({ key, name, min })));
  });
});

describe("statsFrom", () => {
  it("a missing doc is 0 contributions, the Fledgling next", () => {
    expect(statsFrom(null)).toEqual(ZERO_STATS);
    expect(ZERO_STATS).toMatchObject({ contributions: 0, tier: null, nextTier: "fledgling", toNext: 1 });
  });
  it("reads a stored doc", () => {
    expect(statsFrom({ contributions: 6, waiting: 1, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15 })).toEqual({ contributions: 6, waiting: 1, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15 });
    expect(statsFrom({ contributions: 30, tier: "queryhawk", nextTier: null, toNext: null, topPct: null })).toMatchObject({ tier: "queryhawk", nextTier: null, toNext: null });
  });
  it("anything malformed falls back to zero, never a guess", () => {
    expect(statsFrom({ contributions: -3, tier: "eagle", topPct: "10" })).toMatchObject({ contributions: 0, tier: null, topPct: null });
  });
});

describe("the ring", () => {
  it("is the share of the way from this tier to the next", () => {
    expect(ringFraction({ ...ZERO_STATS })).toBe(0);
    expect(ringFraction({ ...ZERO_STATS, contributions: 1, tier: "fledgling" })).toBe(0);
    expect(ringFraction({ ...ZERO_STATS, contributions: 6, tier: "archivist" })).toBeCloseTo(0.6);
    expect(ringFraction({ ...ZERO_STATS, contributions: 11, tier: "scout" })).toBeCloseTo(3 / 7);
  });
  it("is full at QueryHawk, and never outside 0–1 when a held level is above the total", () => {
    expect(ringFraction({ ...ZERO_STATS, contributions: 25, tier: "queryhawk" })).toBe(1);
    expect(ringFraction({ ...ZERO_STATS, contributions: 2, tier: "scout" })).toBe(0);
  });
  it("tierIndex", () => {
    expect([tierIndex(null), tierIndex("fledgling"), tierIndex("queryhawk")]).toEqual([-1, 0, 4]);
  });
});

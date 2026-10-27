/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB93 B3 — the client's reading of `foundingStats/{uid}`, and its tier table held equal to the server's.
 */
import { describe, it, expect } from "vitest";
import { TIERS, ZERO_STATS, cardTier, ringFraction, statsFrom, tierIndex } from "./foundingStats";
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
    expect(statsFrom({ contributions: 6, waiting: 1, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15 })).toEqual({ contributions: 6, waiting: 1, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15, foundingNo: null, joinedAt: null, lastSentAt: null });
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

/* DB105 A1 — the founding number and two dates, read off the server's doc. */
describe("statsFrom — the founding number (DB105)", () => {
  const ts = (ms: number) => ({ toMillis: () => ms });
  it("maps foundingNo, joinedAt and lastSentAt (Timestamps to ms)", () => {
    const s = statsFrom({ contributions: 0, foundingNo: 23, joinedAt: ts(1_700_000_000_000), lastSentAt: ts(1_760_000_000_000) });
    expect(s.foundingNo).toBe(23);
    expect(s.joinedAt).toBe(1_700_000_000_000);
    expect(s.lastSentAt).toBe(1_760_000_000_000);
  });
  it("no number unless the server stated a whole, positive one", () => {
    for (const foundingNo of [null, undefined, 0, -3, 1.5, "23"]) expect(statsFrom({ foundingNo }).foundingNo).toBeNull();
    expect(ZERO_STATS.foundingNo).toBeNull();
  });
});

/* DB105 A3 — the card's tier index: 0 = Egg, 1 Fledgling … 5 QueryHawk. */
describe("cardTier (DB105)", () => {
  it("is the shown tier plus one", () => {
    expect(cardTier(statsFrom(null))).toBe(0);
    expect(cardTier(statsFrom({ tier: "fledgling" }))).toBe(1);
    expect(cardTier(statsFrom({ tier: "queryhawk", contributions: 2 }))).toBe(5);
  });
});

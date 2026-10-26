/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 A5 — the track, for every stage: where the current node sits, how many steps are past, and
 * which lines are navy.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { daysSinceSent, furthestReached, queryTrack } from "./queryTrack";

const states = (s: QueryStatus | string, d?: Parameters<typeof queryTrack>[1]) => queryTrack(s, d).steps.map((x) => x.state[0]).join("");

describe("queryTrack — every live stage", () => {
  const cases: [QueryStatus, number][] = [
    [QueryStatus.QUERIED, 0], [QueryStatus.PARTIAL_REQUESTED, 1], [QueryStatus.PARTIAL_SENT, 1],
    [QueryStatus.FULL_REQUESTED, 2], [QueryStatus.FULL_SENT, 2], [QueryStatus.REVISE_RESUBMIT, 2],
    [QueryStatus.RESUBMITTED, 2], [QueryStatus.OFFER, 3], [QueryStatus.SIGNED, 3],
  ];
  for (const [s, i] of cases) {
    it(`${s} sits on step ${i}, with ${i} past and navy lines between them`, () => {
      const t = queryTrack(s);
      expect(t.index).toBe(i);
      expect(t.closed).toBe(false);
      expect(t.steps.filter((x) => x.state === "past")).toHaveLength(i);
      expect(t.steps[i].state).toBe("current");
      expect(t.lines.filter((l) => l === "on")).toHaveLength(i);
    });
  }
  it("draws the queried, partial and offer shapes", () => {
    expect(states(QueryStatus.QUERIED)).toBe("cfff");
    expect(states(QueryStatus.PARTIAL_REQUESTED)).toBe("pcff");
    expect(states(QueryStatus.OFFER)).toBe("pppc");
  });
});

describe("queryTrack — a closed query", () => {
  for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) {
    it(`${s}: every line grey, the node on the furthest step reached`, () => {
      expect(queryTrack(s).index).toBe(0);
      expect(queryTrack(s, { fullSentDate: "2026-05-01" }).index).toBe(2);
      expect(queryTrack(s, { fullSentDate: "2026-05-01" }).lines).toEqual(["off", "off", "off"]);
      expect(queryTrack(s).closed).toBe(true);
    });
  }
  it("reads the furthest rung, offer first", () => {
    expect(furthestReached({ partialSentDate: "x" })).toBe(1);
    expect(furthestReached({ partialSentDate: "x", fullRequestedDate: "y" })).toBe(2);
    expect(furthestReached({ offerDate: "z" })).toBe(3);
    expect(furthestReached(null)).toBe(0);
  });
});

describe("daysSinceSent", () => {
  it("counts whole days and never goes negative", () => {
    const now = Date.UTC(2026, 9, 26, 12);
    expect(daysSinceSent(now - 43 * 86_400_000, now)).toBe(43);
    expect(daysSinceSent(now + 5000, now)).toBe(0);
    expect(daysSinceSent(null, now)).toBeNull();
  });
});

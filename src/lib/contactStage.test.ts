/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { STAGE_TRACK, discTone, stageTrack } from "./contactStage";
import type { AgentFacts } from "./contactList";

type X = Pick<AgentFacts, "standing" | "q" | "door">;
const live = (status: QueryStatus, furthest: "query" | "partial" | "full"): X =>
  ({ standing: { kind: "open", yourMove: false }, q: { status, furthest }, door: "open" }) as unknown as X;

describe("contactStage — the four-bar track", () => {
  it("names four stages, in order", () => { expect([...STAGE_TRACK]).toEqual(["Queried", "Partial", "Full", "Offer"]); });
  it("fills one bar per stage reached: 1, 2, 3, 4", () => {
    expect(stageTrack(live(QueryStatus.QUERIED, "query"))).toEqual({ filled: 1, closed: false });
    expect(stageTrack(live(QueryStatus.PARTIAL_REQUESTED, "partial"))).toEqual({ filled: 2, closed: false });
    expect(stageTrack(live(QueryStatus.FULL_SENT, "full"))).toEqual({ filled: 3, closed: false });
    expect(stageTrack(live(QueryStatus.OFFER, "full"))).toEqual({ filled: 4, closed: false });
    expect(stageTrack(live(QueryStatus.SIGNED, "full"))).toEqual({ filled: 4, closed: false });
  });
  it("a partial that was requested and then sent is still two bars (furthest reads the history)", () => {
    expect(stageTrack(live(QueryStatus.PARTIAL_SENT, "partial"))?.filled).toBe(2);
  });
  it("a closed agent fills none: all four are the closed grey, however far it got", () => {
    const x = { standing: { kind: "closed", status: QueryStatus.REJECTED }, q: { status: QueryStatus.REJECTED, furthest: "full" }, door: "open" } as unknown as X;
    expect(stageTrack(x)).toEqual({ filled: 0, closed: true });
  });
  it("an agent with no query has no track", () => {
    expect(stageTrack({ standing: { kind: "none" }, q: null, door: "open" } as unknown as X)).toBeNull();
  });
});

describe("contactStage — the disc's colour group", () => {
  it("not queried, querying, closed", () => {
    expect(discTone({ standing: { kind: "none" }, door: "open" } as unknown as X)).toBe("none");
    expect(discTone({ standing: { kind: "none" }, door: "unknown" } as unknown as X)).toBe("none");
    expect(discTone(live(QueryStatus.QUERIED, "query"))).toBe("live");
    expect(discTone({ standing: { kind: "closed", status: QueryStatus.REJECTED }, door: "open" } as unknown as X)).toBe("closed");
  });
  it("closed to queries and never queried is closed too", () => {
    expect(discTone({ standing: { kind: "none" }, door: "closed" } as unknown as X)).toBe("closed");
  });
  it("a live query outranks a shut door", () => {
    expect(discTone({ ...live(QueryStatus.QUERIED, "query"), door: "closed" } as X)).toBe("live");
  });
});

import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { heardFact, slipDir, slipTone, slipTrack } from "./qc153";

const span = (status: QueryStatus, startMs: number) => ({ status, startMs, endMs: null, current: false });
const hist = (...s: QueryStatus[]) => ({ spans: s.map((x, i) => span(x, 1000 + i)), currentStartMs: null, dated: true });

describe("the slip's header colour is the stage", () => {
  it("maps every status to its stage's tint", () => {
    const want: Record<string, string> = {
      [QueryStatus.QUERIED]: "sand", [QueryStatus.PARTIAL_REQUESTED]: "rose", [QueryStatus.PARTIAL_SENT]: "rose",
      [QueryStatus.FULL_REQUESTED]: "blue", [QueryStatus.FULL_SENT]: "blue", [QueryStatus.REVISE_RESUBMIT]: "blue",
      [QueryStatus.RESUBMITTED]: "blue", [QueryStatus.OFFER]: "heather", [QueryStatus.SIGNED]: "heather",
      [QueryStatus.REJECTED]: "sand", [QueryStatus.NO_RESPONSE]: "sand", [QueryStatus.WITHDRAWN]: "sand",
    };
    for (const s of Object.values(QueryStatus)) expect([s, slipTone(s)]).toEqual([s, want[s]]);
  });
});

describe("the arrow says in, out or ended", () => {
  it("maps every status", () => {
    const want: Record<string, string> = {
      [QueryStatus.QUERIED]: "out", [QueryStatus.PARTIAL_SENT]: "out", [QueryStatus.FULL_SENT]: "out", [QueryStatus.RESUBMITTED]: "out",
      [QueryStatus.PARTIAL_REQUESTED]: "in", [QueryStatus.FULL_REQUESTED]: "in", [QueryStatus.REVISE_RESUBMIT]: "in",
      [QueryStatus.OFFER]: "in", [QueryStatus.SIGNED]: "in",
      [QueryStatus.REJECTED]: "end", [QueryStatus.NO_RESPONSE]: "end", [QueryStatus.WITHDRAWN]: "end",
    };
    for (const s of Object.values(QueryStatus)) expect([s, slipDir(s)]).toEqual([s, want[s]]);
  });
});

describe("the track marks skipped steps", () => {
  it("query straight to full skips the partial, and the line into it is dotted", () => {
    const t = slipTrack({ status: QueryStatus.FULL_REQUESTED, furthest: "full", history: hist(QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED) });
    expect(t.nodes).toEqual(["reached", "skip", "cur", "fut"]);
    expect(t.links).toEqual(["skip", "done", "fut"]);
  });
  it("a partial on the way reaches every step before the full", () => {
    const t = slipTrack({ status: QueryStatus.FULL_SENT, furthest: "full", history: hist(QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT) });
    expect(t.nodes).toEqual(["reached", "reached", "cur", "fut"]);
    expect(t.links).toEqual(["done", "done", "fut"]);
  });
  it("a closed query ends greyed at its furthest stage, with its own glyph", () => {
    const t = slipTrack({ status: QueryStatus.NO_RESPONSE, furthest: "partial", history: hist(QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.NO_RESPONSE) });
    expect(t).toMatchObject({ ended: true, cur: 1, end: "nr", nodes: ["reached", "cur", "fut", "fut"] });
  });
  it("a closed span never counts as reaching a stage", () => {
    const t = slipTrack({ status: QueryStatus.OFFER, furthest: "full", history: hist(QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.OFFER) });
    expect(t.nodes).toEqual(["reached", "skip", "skip", "cur"]);
  });
});

describe("Last heard names the agent's move", () => {
  it("even when the query went out the same day", () => {
    const h = { spans: [span(QueryStatus.QUERIED, 5000), span(QueryStatus.REVISE_RESUBMIT, 5000)], currentStartMs: null, dated: true };
    expect(heardFact({ history: h }, 9000).line).toBe("revise & resubmit");
  });
});

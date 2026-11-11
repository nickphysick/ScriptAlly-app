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

/* v153.2 — the Next box's second line (the ref's: design-refs/query-centre-v153-2.html) */
import { nextFact } from "./qc153";
import type { QcRow } from "./qcSummary";
describe("the Next box's second line", () => {
  const DAY = 86_400_000;
  const NOW = new Date(2026, 10, 8, 12).getTime();
  const row = (status: QueryStatus, court: string, more: Partial<QcRow> = {}) => ({
    id: "q", status, court, withYou: court === "you", stageStartMs: NOW - 25 * DAY, expectedMs: null, pastExpected: false,
    furthest: "query", history: hist(QueryStatus.QUERIED), query: {}, ...more,
  }) as unknown as QcRow;
  it("an offer: answer the offer", () => {
    expect(nextFact(row(QueryStatus.OFFER, "offer"), NOW).line).toBe("answer the offer");
  });
  it("a partial requested: asked N days ago, from the day it was asked", () => {
    expect(nextFact(row(QueryStatus.PARTIAL_REQUESTED, "you"), NOW).line).toBe("asked 25 days ago");
    expect(nextFact(row(QueryStatus.FULL_REQUESTED, "you", { stageStartMs: NOW }), NOW).line).toBe("asked today");
  });
  /* Log a query v1.3 D — "reply by …" is retired: the reply date is the value under "Reply expected by", and the line
     says what is planned (the full set is in queryActions/logNudge.test.ts) */
  it("with the agent: the reply date under Reply expected by, or time for a nudge once it has passed", () => {
    const f = nextFact(row(QueryStatus.QUERIED, "agent", { expectedMs: NOW + 19 * DAY }), NOW);
    expect(f.label).toBe("Reply expected by");
    expect(f.value).toMatch(/^\d{1,2} \w{3}$/);
    expect(f.line).toBe("No nudge planned");
    expect(nextFact(row(QueryStatus.QUERIED, "agent", { expectedMs: NOW - 23 * DAY, pastExpected: true }), NOW).line).toBe("time for a nudge");
  });
  it("closed: no second line", () => {
    expect(nextFact(row(QueryStatus.REJECTED, "closed"), NOW).line).toBeNull();
  });
});

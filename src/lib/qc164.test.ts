/**
 * Query card v164 — the strip's status (lib/qc164 stripStatus164), for EVERY status, the closed kinds among them (the
 * browser locks, tests/e2e/qc164.measure.ts L1/L2, read the seeded cards; No response, Signed and Resubmitted are not
 * seeded, so this is where they are held).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { STAGE_NAME } from "./qcSummary";
import { stripStatus164 } from "./qc164";

const row = (status: QueryStatus, furthest: "query" | "partial" | "full" = "query") => ({ status, furthest, history: { spans: [] } } as unknown as Parameters<typeof stripStatus164>[0]);
const STEP: Record<QueryStatus, number> = {
  [QueryStatus.QUERIED]: 1, [QueryStatus.PARTIAL_REQUESTED]: 2, [QueryStatus.PARTIAL_SENT]: 2, [QueryStatus.FULL_REQUESTED]: 3, [QueryStatus.FULL_SENT]: 3,
  [QueryStatus.REVISE_RESUBMIT]: 3, [QueryStatus.RESUBMITTED]: 3, [QueryStatus.OFFER]: 4, [QueryStatus.SIGNED]: 4,
  [QueryStatus.REJECTED]: 0, [QueryStatus.WITHDRAWN]: 0, [QueryStatus.NO_RESPONSE]: 0,
};
const CLOSED = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];

describe("v164 L1 — the strip's status name is the status's display name", () => {
  it("for every status, and never v152.2's words", () => {
    for (const s of Object.values(QueryStatus)) {
      const x = stripStatus164(row(s));
      expect(x.name, s).toBe(STAGE_NAME[s]);
      expect(x.name, s).not.toMatch(/your move|with the agent/i);
      expect(x.name, s).toMatch(/^[A-Z][^A-Z]*$/); // sentence case
    }
  });
});

describe("v164 L2 — the track's current step matches the status", () => {
  it("every live status: its step, and the accessible name says it", () => {
    for (const s of Object.values(QueryStatus).filter((x) => !CLOSED.includes(x))) {
      const x = stripStatus164(row(s, "full"));
      expect(x.track.cur + 1, s).toBe(STEP[s]);
      expect(x.track.ended, s).toBe(false);
      expect(x.track.nodes.filter((n) => n === "cur"), s).toHaveLength(1);
      expect(x.label, s).toBe(`${STAGE_NAME[s]}, step ${STEP[s]} of 4`);
    }
  });
  it("each closed kind: its closing mark at the step it reached, the name alone", () => {
    for (const s of CLOSED) {
      for (const [f, at] of [["query", 0], ["partial", 1], ["full", 2]] as const) {
        const x = stripStatus164(row(s, f));
        expect(x.track.ended, s).toBe(true);
        expect(x.track.cur, `${s} at ${f}`).toBe(at);
        expect(x.track.nodes[at], `${s} at ${f}`).toBe("cur");
        expect(x.track.end, s).toBe(s === QueryStatus.REJECTED ? "rj" : s === QueryStatus.WITHDRAWN ? "wd" : "nr");
        expect(x.label, s).toBe(STAGE_NAME[s]);
      }
    }
  });
});

/**
 * Query Centre v155 — the quiet state's condition and copy (lib/qc155). Rows are stamped as the desktop list stamps them
 * (`qs`, lib/queryState).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { quietBody155, quietNow155 } from "./qc155";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 12, 12).getTime();
let n = 0;
const row = (qs: string, extra: Record<string, unknown> = {}): QcRow => ({
  id: `q${++n}`, agentName: "Tom Ellery", agencyKey: "Curtis Vane", status: QueryStatus.QUERIED,
  court: qs === "closed" ? "closed" : qs === "offer" || qs === "materials" ? "you" : "agent",
  expectedMs: NOW + 15 * DAY, stageStartMs: NOW - 20 * DAY, sentMs: NOW - 20 * DAY, pastExpected: qs === "nudge" || qs === "quiet",
  query: { id: "x" }, qs, ...extra,
} as unknown as QcRow);
const LIST = { view: "list" as const, filtersOn: false };

describe("v155 · the quiet condition", () => {
  it("is true with only waiting, gone-quiet and closed queries", () => {
    expect(quietNow155({ ...LIST, rows: [row("agent"), row("quiet"), row("closed")] })).toBe(true);
    expect(quietNow155({ ...LIST, rows: [row("quiet"), row("closed")] })).toBe(true);
  });
  it("is false as soon as one query is in Offers, Materials requested or Nudge due", () => {
    for (const k of ["offer", "materials", "nudge"]) {
      expect(quietNow155({ ...LIST, rows: [row("agent"), row("quiet"), row(k)] }), k).toBe(false);
    }
  });
  it("is false when a filter or search is active", () => {
    expect(quietNow155({ view: "list", filtersOn: true, rows: [row("agent")] })).toBe(false);
  });
  it("is false in Birds-eye", () => {
    expect(quietNow155({ view: "birds", filtersOn: false, rows: [row("agent")] })).toBe(false);
  });
  it("is false with no queries at all (that is day one)", () => {
    expect(quietNow155({ ...LIST, rows: [] })).toBe(false);
  });
});

describe("v155 · the quiet panel's body", () => {
  it("plural, with the earliest expected reply formatted like the cards", () => {
    const rows = [row("agent", { expectedMs: NOW + 20 * DAY }), row("agent", { expectedMs: NOW + 15 * DAY }), row("agent", { expectedMs: null }), row("quiet"), row("closed")];
    expect(quietBody155(rows, NOW)).toBe("3 queries are with agents. The next reply is expected by 27 Nov.");
  });
  it("reads a waiting query's own reply date before its stage's", () => {
    const rows = [row("agent", { expectedMs: NOW + 20 * DAY, replyMs: NOW + 2 * DAY })];
    expect(quietBody155(rows, NOW)).toBe("1 query is with an agent. The next reply is expected by 14 Nov.");
  });
  it("singular", () => {
    expect(quietBody155([row("agent"), row("closed")], NOW)).toBe("1 query is with an agent. The next reply is expected by 27 Nov.");
  });
  it("drops the second sentence when no waiting query has an expected date", () => {
    expect(quietBody155([row("agent", { expectedMs: null }), row("agent", { expectedMs: null })], NOW)).toBe("2 queries are with agents.");
  });
  it("says nothing is out when nothing is with agents either", () => {
    expect(quietBody155([row("quiet"), row("closed")], NOW)).toBe("Nothing is out with agents right now.");
  });
});

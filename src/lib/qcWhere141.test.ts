/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 §A / v141.1 — the four sets (`whereItStands`, on the nudge window) and the one "Where it stands"
 * filter. v141.1 re-pointed this file: Gone quiet starts where the nudge window ends, not at the reply date.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { WHERE_KEYS, courtOf, whereCounts, whereItStands, type WhereKey } from "./qcSummary";
import { emptyQc138Filters, matches138, qc138FilterCount, type Filterable } from "./qc138";
import { sanitiseQcVisit, QC_VISIT_VERSION } from "./qcViewMemory";
import { appliedChips } from "./qc140";
import { nextAction } from "./qcCalView";
import { CLOSE_OVER_DAYS, CLOSE_UNDATED_DAYS } from "./nudgeWindow";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 20, 12);
const ALL = Object.values(QueryStatus) as QueryStatus[];
/** a row `daysPast` past its expected date (negative: before it; null: undated, `inStage` days in its stage) */
const row = (status: QueryStatus, daysPast: number | null, inStage = 10): Filterable => ({
  status, court: courtOf(status), expectedMs: daysPast == null ? null : NOW - daysPast * DAY, stageStartMs: NOW - inStage * DAY,
  pastExpected: courtOf(status) === "agent" && daysPast != null && daysPast >= 0, sentMs: null, materialsRecorded: true, query: {},
});
const every = ALL.flatMap((s) => [row(s, -5), row(s, 3), row(s, 40), row(s, null, 10), row(s, null, 100)]);

describe("whereItStands — four disjoint sets covering every query, on the nudge window", () => {
  it("puts every status at every point in time in exactly one set", () => {
    for (const r of every) expect(WHERE_KEYS).toContain(whereItStands(r, NOW));
    const c = whereCounts(every, NOW);
    expect(c.you + c.agent + c.quiet + c.closed).toBe(every.length);
  });
  it("an agent-court query moves along the timeline: wait, nudge (With you), close (Gone quiet)", () => {
    expect(whereItStands(row(QueryStatus.QUERIED, -1), NOW)).toBe("agent");
    expect(whereItStands(row(QueryStatus.QUERIED, 1), NOW)).toBe("you");
    expect(whereItStands(row(QueryStatus.QUERIED, CLOSE_OVER_DAYS), NOW)).toBe("you");
    expect(whereItStands(row(QueryStatus.QUERIED, CLOSE_OVER_DAYS + 1), NOW)).toBe("quiet");
    expect(whereItStands(row(QueryStatus.FULL_SENT, 40), NOW)).toBe("quiet");
  });
  it("undated: with the agent until the stage is CLOSE_UNDATED_DAYS old, then gone quiet", () => {
    expect(whereItStands(row(QueryStatus.QUERIED, null, CLOSE_UNDATED_DAYS), NOW)).toBe("agent");
    expect(whereItStands(row(QueryStatus.QUERIED, null, CLOSE_UNDATED_DAYS + 1), NOW)).toBe("quiet");
  });
  it("the writer's court and the closed statuses are untouched by the clock", () => {
    for (const d of [-5, 3, 40]) {
      expect(whereItStands(row(QueryStatus.FULL_REQUESTED, d), NOW)).toBe("you");
      expect(whereItStands(row(QueryStatus.OFFER, d), NOW)).toBe("you");
      for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]) expect(whereItStands(row(s, d), NOW)).toBe("closed");
    }
  });
  it("agrees with the Next action grouping: Gone quiet is Consider closing, an agent-court With you is Nudge", () => {
    for (const r of every.filter((x) => x.court === "agent")) {
      const a = nextAction(r as never, NOW);
      const w = whereItStands(r, NOW);
      expect(w === "quiet").toBe(a === "close");
      expect(w === "you").toBe(a === "nudge");
    }
  });
});

describe("the one filter field", () => {
  it("narrows to exactly its set, counts once, clears with the rest", () => {
    for (const k of WHERE_KEYS) {
      const f = { ...emptyQc138Filters(), where: k as WhereKey };
      const kept = every.filter((r) => matches138(r, f, NOW));
      expect(kept.length).toBe(whereCounts(every, NOW)[k]);
      expect(kept.every((r) => whereItStands(r, NOW) === k)).toBe(true);
      expect(qc138FilterCount(f)).toBe(1);
    }
    expect(emptyQc138Filters().where).toBeNull();
  });
  it("the Your move quick pick selects exactly the With you set", () => {
    const viaPick = every.filter((r) => matches138(r, { ...emptyQc138Filters(), you: true }, NOW));
    const viaSet = every.filter((r) => matches138(r, { ...emptyQc138Filters(), where: "you" }, NOW));
    expect(viaPick).toEqual(viaSet);
    expect(viaPick.length).toBeGreaterThan(0);
  });
  it("ANDs with the other filters", () => {
    const f = { ...emptyQc138Filters(), where: "quiet" as const, stages: [QueryStatus.QUERIED] };
    const kept = every.filter((r) => matches138(r, f, NOW));
    expect(kept.length).toBe(2);
    expect(kept.every((r) => r.status === QueryStatus.QUERIED)).toBe(true);
  });
  it("has a removable applied chip", () => {
    const chips = appliedChips({ ...emptyQc138Filters(), where: "agent" }, () => "");
    expect(chips.map((c) => c.label)).toEqual(["With the agent"]);
    expect(chips[0].off({ ...emptyQc138Filters(), where: "agent" }).where).toBeNull();
  });
  it("persists for the visit, and refuses a value that is not a set", () => {
    expect(sanitiseQcVisit({ v: QC_VISIT_VERSION, filters: { where: "quiet" } })?.filters.where).toBe("quiet");
    expect(sanitiseQcVisit({ v: QC_VISIT_VERSION, filters: { where: "late" } })?.filters.where).toBeNull();
  });
});

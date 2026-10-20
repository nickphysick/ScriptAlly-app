/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 §A — the four sets (`whereItStands`) and the one "Where it stands" filter.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { WHERE_KEYS, whereCounts, whereItStands, type WhereKey } from "./qcSummary";
import { emptyQc138Filters, matches138, qc138FilterCount, type Filterable } from "./qc138";
import { sanitiseQcVisit, QC_VISIT_VERSION } from "./qcViewMemory";
import { appliedChips } from "./qc140";
import { isYourMoveRow } from "./queryCentreGroups";
import { courtOf } from "./qcSummary";

const ALL = Object.values(QueryStatus) as QueryStatus[];
const row = (status: QueryStatus, pastExpected: boolean): Filterable => ({
  status, pastExpected: courtOf(status) === "agent" && pastExpected, court: courtOf(status), expectedMs: null, sentMs: null,
  materialsRecorded: true, query: {},
});
const every = ALL.flatMap((s) => [row(s, false), row(s, true)]);

describe("whereItStands — four disjoint sets covering every query", () => {
  it("puts every status, past its date or not, in exactly one set", () => {
    for (const r of every) expect(WHERE_KEYS).toContain(whereItStands(r));
    const c = whereCounts(every);
    expect(c.you + c.agent + c.quiet + c.closed).toBe(every.length);
  });
  it("the four branches", () => {
    expect(whereItStands(row(QueryStatus.FULL_REQUESTED, false))).toBe("you");
    expect(whereItStands(row(QueryStatus.OFFER, false))).toBe("you");
    expect(whereItStands(row(QueryStatus.QUERIED, false))).toBe("agent");
    expect(whereItStands(row(QueryStatus.QUERIED, true))).toBe("quiet");
    expect(whereItStands(row(QueryStatus.FULL_SENT, true))).toBe("quiet");
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]) expect(whereItStands(row(s, false))).toBe("closed");
  });
  it("a with-you query past a date is still with you (only the agent's court goes quiet)", () => {
    expect(whereItStands({ status: QueryStatus.PARTIAL_REQUESTED, pastExpected: true })).toBe("you");
  });
  it("is not the Your move quick pick: an agent-court query past its date is Your move AND Gone quiet", () => {
    const r = row(QueryStatus.QUERIED, true);
    expect(isYourMoveRow(r)).toBe(true);
    expect(whereItStands(r)).toBe("quiet");
  });
});

describe("the one filter field", () => {
  const now = Date.UTC(2026, 9, 20);
  it("narrows to exactly its set, counts once, clears with the rest", () => {
    for (const k of WHERE_KEYS) {
      const f = { ...emptyQc138Filters(), where: k as WhereKey };
      const kept = every.filter((r) => matches138(r, f, now));
      expect(kept.length).toBe(whereCounts(every)[k]);
      expect(kept.every((r) => whereItStands(r) === k)).toBe(true);
      expect(qc138FilterCount(f)).toBe(1);
    }
    expect(emptyQc138Filters().where).toBeNull();
  });
  it("ANDs with the other filters", () => {
    const f = { ...emptyQc138Filters(), where: "quiet" as const, stages: [QueryStatus.QUERIED] };
    const kept = every.filter((r) => matches138(r, f, now));
    expect(kept.length).toBe(1);
    expect(kept[0].status).toBe(QueryStatus.QUERIED);
  });
  it("has a removable applied chip", () => {
    const chips = appliedChips({ ...emptyQc138Filters(), where: "agent" }, () => "");
    expect(chips.map((c) => c.label)).toEqual(["With the agent"]);
    expect(chips[0].off({ ...emptyQc138Filters(), where: "agent" }).where).toBeNull();
  });
  it("persists for the visit, and refuses a value that is not a set", () => {
    const ok = sanitiseQcVisit({ v: QC_VISIT_VERSION, filters: { where: "quiet" } });
    expect(ok?.filters.where).toBe("quiet");
    const bad = sanitiseQcVisit({ v: QC_VISIT_VERSION, filters: { where: "late" } });
    expect(bad?.filters.where).toBeNull();
  });
});

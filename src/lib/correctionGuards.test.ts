/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 3 — the guards. Each offers a path; none is a bare refusal.
 *
 * ⚠️ THE DEPENDENCY AND KIND GUARDS ARE ASSERTED THROUGH THE CTA ENGINE, never against a list of
 * pairs written here. "A send is what some request targets" is `getPrimaryAction`'s answer, so a new
 * stage joins both guards for free and cannot come to disagree with the chapters or the command bar.
 */
import { describe, it, expect } from "vitest";
import {
  canCorrect, rootGuard, dependencyGuard, kindGuard, sameDirection, crossedBy,
  isFutureDate, moveGuard, moveTargetNote, staleNoteCheck, type GuardEvent,
} from "./correctionGuards";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 20);
const ev = (id: string, status: QueryStatus, daysAgo: number): GuardEvent =>
  ({ activityId: id, status, timeMs: NOW - daysAgo * DAY });

const log: GuardEvent[] = [
  ev("a1", QueryStatus.QUERIED, 300),
  ev("a2", QueryStatus.PARTIAL_REQUESTED, 200),
  ev("a3", QueryStatus.PARTIAL_SENT, 190),
];

describe("Phase 3 · the ⋯ needs a document behind it", () => {
  /**
   * ⚠️ THIS SUPERSEDES THE POSITIONAL ROOT RULE FOR THE SYNTHESISED CASE. `buildTimelineRows`
   * invents a root from `query.dateSent` when no Queried rung exists, and it has no `activityId` —
   * nothing to edit, nothing to delete. Position cannot tell it apart: its status is exactly
   * QUERIED, the same as a real one.
   */
  it("a row with no activityId offers nothing", () => {
    expect(canCorrect({ status: QueryStatus.QUERIED, timeMs: NOW })).toBe(false);
    expect(canCorrect(ev("a1", QueryStatus.QUERIED, 300))).toBe(true);
  });
});

describe("Phase 3 · the root is editable, never removable", () => {
  it("removing the earliest event routes to deleting the query", () => {
    const v = rootGuard(log[0], log);
    expect(v.kind).toBe("route");
    if (v.kind !== "route") return;
    expect(v.route).toBe("delete-query");
    expect(v.message, "the guard refuses without saying why").toContain("no beginning");
    expect(v.routeLabel, "the guard refuses without offering anywhere to go").toBe("Delete this query…");
  });

  /** ⚠️ POSITION, NOT TYPE — a later Queried rung is not a root. */
  it("a non-earliest event is unguarded, whatever its type", () => {
    expect(rootGuard(log[2], log).kind).toBe("allow");
    const oddOrder = [ev("z", QueryStatus.QUERIED, 10), ...log];
    expect(rootGuard(oddOrder[0], oddOrder).kind, "a late Queried rung was treated as the root").toBe("allow");
  });
});

describe("Phase 3 · a request a send answers cannot leave alone", () => {
  it("offers both entries rather than cascading silently", () => {
    const v = dependencyGuard(log[1], log);
    expect(v.kind).toBe("cascade");
    if (v.kind !== "cascade") return;
    expect(v.partners.map((p) => p.activityId)).toEqual(["a3"]);
    expect(v.message).toContain("answering nothing");
  });

  it("an unanswered request removes freely", () => {
    expect(dependencyGuard(log[1], log.slice(0, 2)).kind).toBe("allow");
  });

  /** ⚠️ A SEND BEFORE ITS REQUEST IS NOT AN ANSWER — the pairing is ordered, not merely present. */
  it("a send that predates the request does not bind it", () => {
    const odd = [log[0], ev("a2", QueryStatus.PARTIAL_REQUESTED, 100), ev("a3", QueryStatus.PARTIAL_SENT, 200)];
    expect(dependencyGuard(odd[1], odd).kind).toBe("allow");
  });

  it("a send is not a request, so it carries no dependents", () => {
    expect(dependencyGuard(log[2], log).kind).toBe("allow");
  });
});

describe("Phase 3 · kind edits stay within direction", () => {
  it("request↔request and send↔send are corrections", () => {
    expect(sameDirection(QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED)).toBe(true);
    expect(sameDirection(QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT)).toBe(true);
    expect(kindGuard(QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED).kind).toBe("allow");
  });

  /** ⚠️ ACROSS THE LINE CHANGES WHO ACTED, which is a different event rather than a corrected one. */
  it("across the line routes, and says who it would rewrite", () => {
    const v = kindGuard(QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT);
    expect(v.kind).toBe("route");
    if (v.kind !== "route") return;
    expect(v.message).toContain("who acted");
    expect(v.routeLabel).toBe("Edit instead");
  });
});

describe("Phase 3 · a date that crosses another event", () => {
  it("names what it crossed, in either direction", () => {
    /* a3 (190d ago) dragged back past a2 (200d ago) */
    expect(crossedBy(log[2], NOW - 250 * DAY, log).map((e) => e.activityId)).toEqual(["a2"]);
    /* and a2 dragged forward past a3 */
    expect(crossedBy(log[1], NOW - 100 * DAY, log).map((e) => e.activityId)).toEqual(["a3"]);
  });

  it("a date that crosses nothing is not a reorder", () => {
    expect(crossedBy(log[2], NOW - 195 * DAY, log)).toEqual([]);
  });
});

describe("Phase 3 · no future dates", () => {
  it("tomorrow is refused and today is not", () => {
    expect(isFutureDate(new Date(NOW + DAY).toISOString(), NOW)).toBe(true);
    expect(isFutureDate(new Date(NOW - DAY).toISOString(), NOW)).toBe(false);
  });
});

describe("Phase 3 · move", () => {
  it("a root cannot travel", () => {
    const v = moveGuard(log[0], log);
    expect(v.kind).toBe("route");
    if (v.kind !== "route") return;
    expect(v.message).toContain("no beginning");
  });

  it("anything else can", () => {
    expect(moveGuard(log[2], log).kind).toBe("allow");
  });

  /** ⚠️ CLOSED TARGETS ARE OFFERED AND STATED TRUTHFULLY — hiding them would leave a misfiled event
   *  unfixable, and implying a move reopens the query would be worse than either. */
  it("a closed destination says what it will not do", () => {
    expect(moveTargetNote({ queryId: "q", agentName: "A", status: QueryStatus.REJECTED, closed: true }))
      .toContain("will not reopen it");
    expect(moveTargetNote({ queryId: "q", agentName: "A", status: QueryStatus.QUERIED, closed: false }))
      .toBe(QueryStatus.QUERIED);
  });

  /** ⚠️ A NOTE NAMING THE OLD AGENT MUST NOT TRAVEL SILENTLY. */
  it("a note naming the old agent is flagged before it travels", () => {
    const r = staleNoteCheck("Priya asked for fifty pages", "Priya Raman");
    expect(r.stale).toBe(true);
    expect(r.message).toContain("Priya");
    expect(staleNoteCheck("Asked for fifty pages", "Priya Raman").stale).toBe(false);
    expect(staleNoteCheck("", "Priya Raman").stale).toBe(false);
  });
});

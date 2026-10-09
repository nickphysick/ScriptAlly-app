/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC134 §1 — the header's faces: which queries, in which order, and what the row says.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { facesFor } from "./qcFaces";

const DAY = 86_400_000, NOW = Date.parse("2026-10-09T12:00:00Z");
let seq = 0;
const row = (status: QueryStatus, o: Partial<QcRow> = {}): QcRow => {
  const id = `q${String(++seq).padStart(3, "0")}`;
  return { id, status, agentName: `Agent ${id}`, initials: "AA", lastMs: NOW - seq * DAY, expectedMs: null, stageStartMs: NOW - seq * DAY, ...o } as unknown as QcRow;
};
const many = (n: number, s: QueryStatus) => Array.from({ length: n }, () => row(s));

describe("facesFor", () => {
  it("fixture A — 4 / 19 / 4: three with you, three with agents, two closed, in that order, and +19 more", () => {
    const rows = [...many(4, QueryStatus.FULL_REQUESTED), ...many(19, QueryStatus.QUERIED), ...many(4, QueryStatus.REJECTED)];
    const f = facesFor(rows, NOW);
    expect(f.faces.map((x) => x.court)).toEqual(["you", "you", "you", "agent", "agent", "agent", "closed", "closed"]);
    expect(f.total).toBe(27);
    expect(f.more).toBe(19);
    expect(f.sentence).toBe("8 of 27 queries shown: 3 with you, 3 with agents, 2 closed");
  });
  it("fixture B — 0 / 2 / 1: two with agents then one closed; an empty group lends no slots; no more", () => {
    const f = facesFor([...many(2, QueryStatus.PARTIAL_SENT), ...many(1, QueryStatus.NO_RESPONSE)], NOW);
    expect(f.faces.map((x) => x.court)).toEqual(["agent", "agent", "closed"]);
    expect(f.more).toBe(0);
    expect(f.sentence).toBe("3 of 3 queries shown: 0 with you, 2 with agents, 1 closed");
  });
  it("with you: past its date first, then the soonest date, a dateless one last", () => {
    const late = row(QueryStatus.FULL_REQUESTED, { expectedMs: NOW - 3 * DAY });
    const soon = row(QueryStatus.PARTIAL_REQUESTED, { expectedMs: NOW + 2 * DAY });
    const later = row(QueryStatus.OFFER, { expectedMs: NOW + 9 * DAY });
    const none = row(QueryStatus.REVISE_RESUBMIT);
    expect(facesFor([none, later, soon, late], NOW).faces.map((x) => x.id)).toEqual([late.id, soon.id, later.id]);
  });
  it("with agents: most recent activity first; closed: most recently closed first", () => {
    const a = row(QueryStatus.QUERIED, { lastMs: NOW - 9 * DAY }), b = row(QueryStatus.FULL_SENT, { lastMs: NOW - 1 * DAY });
    const c = row(QueryStatus.REJECTED, { stageStartMs: NOW - 30 * DAY, lastMs: NOW }), d = row(QueryStatus.NO_RESPONSE, { stageStartMs: NOW - 2 * DAY, lastMs: NOW - 40 * DAY });
    expect(facesFor([a, b, c, d], NOW).faces.map((x) => x.id)).toEqual([b.id, a.id, d.id, c.id]);
  });
  it("a withdrawn or signed query is counted and never drawn; the line names the stage and the court", () => {
    const f = facesFor([row(QueryStatus.WITHDRAWN), row(QueryStatus.SIGNED), row(QueryStatus.QUERIED)], NOW);
    expect(f.faces.length).toBe(1);
    expect(f.total).toBe(3);
    expect(f.more).toBe(2);
    expect(f.faces[0].line).toBe("Queried · with agents");
    expect(facesFor([row(QueryStatus.QUERIED)], NOW).sentence).toBe("1 of 1 query shown: 0 with you, 1 with agents, 0 closed");
  });
});

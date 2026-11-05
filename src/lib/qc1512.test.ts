/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.2 — the pure parts (lib/qc1512): status colours, header colours, the Next-action groups, the Next
 * column's number, and the row's one action.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { ACTION_1512, STATUS_FILL, actionGroup, actionSections, headFill, headTone, nextNum, rowAct, rowTag, statusKind } from "./qc1512";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 8, 12).getTime();
const at = (d: number) => NOW + d * DAY;
const COURT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "you", [QueryStatus.FULL_REQUESTED]: "you", [QueryStatus.REVISE_RESUBMIT]: "you",
  [QueryStatus.OFFER]: "offer", [QueryStatus.REJECTED]: "closed", [QueryStatus.NO_RESPONSE]: "closed", [QueryStatus.WITHDRAWN]: "closed",
};
const row = (o: { status: QueryStatus; expected?: number | null; stage?: number | null; name?: string }): QcRow => ({
  id: o.name ?? "x", agentName: o.name ?? "Clara", status: o.status, court: COURT[o.status] ?? "agent",
  expectedMs: o.expected === undefined ? null : o.expected, stageStartMs: o.stage ?? null, sentMs: at(-90),
  query: { id: "q" }, history: { spans: [] },
} as unknown as QcRow);

describe("the colour scheme", () => {
  it("one colour per status family; requested and sent share it", () => {
    expect(STATUS_FILL[statusKind(QueryStatus.QUERIED)]).toBe("#e6d9c6");
    expect(statusKind(QueryStatus.PARTIAL_REQUESTED)).toBe(statusKind(QueryStatus.PARTIAL_SENT));
    expect(STATUS_FILL[statusKind(QueryStatus.PARTIAL_SENT)]).toBe("#f3d3c6");
    expect(statusKind(QueryStatus.FULL_REQUESTED)).toBe(statusKind(QueryStatus.FULL_SENT));
    expect(STATUS_FILL[statusKind(QueryStatus.FULL_SENT)]).toBe("#d3dce7");
    expect(STATUS_FILL[statusKind(QueryStatus.OFFER)]).toBe("#cbd9be");
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) expect(STATUS_FILL[statusKind(s)]).toBe("#f1f0ee");
  });
});

describe("group headers", () => {
  it("who it's with: navy, light blue, stone, faded — and v152's Gone quiet, stone fading to white", () => {
    expect(headFill(headTone("attention", "you"))).toBe("#2a3a52");
    expect(headFill(headTone("attention", "nudge"))).toBe("#c5d0dd");
    expect(headFill(headTone("attention", "quiet"))).toMatch(/^linear-gradient\(90deg, #e3dbcf/);
    expect(headFill(headTone("attention", "agent"))).toBe("#e3dbcf");
    expect(headFill(headTone("attention", "closed"))).toBe("#f1efec");
  });
  it("status: each header is its status colour; package: stone", () => {
    expect(headFill(headTone("status", QueryStatus.QUERIED))).toBe("#e6d9c6");
    expect(headFill(headTone("status", QueryStatus.REJECTED))).toBe("#f1f0ee");
    expect(headFill(headTone("package", "pkg:x"))).toBe("#e3dbcf");
  });
  it("next action: the order and colours", () => {
    expect(ACTION_1512.map((g) => g.label)).toEqual(["Answer the offer", "Send your full", "Send your partial", "Send your revision", "Nudge", "Reply due soon", "Waiting to hear", "Close it", "Nothing to do"]);
    expect(headFill(headTone("action", "na:offer"))).toBe("#2a3a52");
    expect(headFill(headTone("action", "na:nudge"))).toBe("#c5d0dd");
    expect(headFill(headTone("action", "na:wait"))).toBe("#e3dbcf");
    expect(headFill(headTone("action", "na:none"))).toBe("#f1efec");
  });
});

describe("the Next-action groups", () => {
  it("files each row once, in order", () => {
    const rows = [
      row({ status: QueryStatus.QUERIED, expected: at(30), name: "wait" }),
      row({ status: QueryStatus.QUERIED, expected: at(3), name: "soon" }),
      row({ status: QueryStatus.QUERIED, expected: at(-5), name: "nudge" }),
      row({ status: QueryStatus.QUERIED, expected: at(-60), name: "quiet" }),
      row({ status: QueryStatus.REJECTED, name: "closed" }),
      row({ status: QueryStatus.OFFER, expected: at(2), name: "offer" }),
      row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-2), name: "partial" }),
    ];
    const s = actionSections(rows, NOW);
    expect(s.map((x) => x.label)).toEqual(["Answer the offer", "Send your partial", "Nudge", "Reply due soon", "Waiting to hear", "Nothing to do"]);
    expect(s.find((x) => x.label === "Nudge")!.rows.map((r) => r.id)).toEqual(["nudge", "quiet"]);
    expect(s.reduce((n, x) => n + x.rows.length, 0)).toBe(rows.length);
    expect(actionGroup(row({ status: QueryStatus.QUERIED, expected: at(7) }), NOW)).toBe("wait");
    /* v152: a row the page has stamped reads its state — Gone quiet is Close it, Nudge due is Nudge */
    expect(actionGroup({ ...row({ status: QueryStatus.QUERIED, expected: at(-60) }), qs: "quiet" } as never, NOW)).toBe("close");
    expect(actionGroup({ ...row({ status: QueryStatus.QUERIED, expected: at(-5) }), qs: "nudge" } as never, NOW)).toBe("nudge");
  });
});

describe("the Next number", () => {
  it("late, left, overdue, to reply, none", () => {
    expect(nextNum(row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-8) }), NOW)).toEqual({ kind: "num", n: 8, label: ["days", "late"], tone: "late" });
    expect(nextNum(row({ status: QueryStatus.OFFER, expected: at(1) }), NOW)).toEqual({ kind: "num", n: 1, label: ["day", "left"], tone: "ink" });
    expect(nextNum(row({ status: QueryStatus.QUERIED, expected: at(-37) }), NOW)).toEqual({ kind: "num", n: 37, label: ["days", "overdue"], tone: "late" });
    expect(nextNum(row({ status: QueryStatus.FULL_SENT, expected: at(36) }), NOW)).toEqual({ kind: "num", n: 36, label: ["days", "to reply"], tone: "faint" });
    expect(nextNum(row({ status: QueryStatus.REJECTED }), NOW)).toEqual({ kind: "dash" });
  });
});

describe("the row's one action and its tag", () => {
  it("yours → navy in the groups' words; past the date → Nudge; else Record a response; closed → none", () => {
    expect(rowAct(row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-2) }), NOW)).toEqual({ tone: "navy", label: "Send your partial", mode: "sent" });
    expect(rowAct(row({ status: QueryStatus.FULL_REQUESTED }), NOW)?.label).toBe("Send your full");
    expect(rowAct(row({ status: QueryStatus.OFFER }), NOW)).toEqual({ tone: "navy", label: "Answer the offer", mode: "offer" });
    expect(rowAct(row({ status: QueryStatus.QUERIED, expected: at(-60) }), NOW)).toEqual({ tone: "nudge", label: "Nudge", mode: "nudge" });
    expect(rowAct(row({ status: QueryStatus.QUERIED, expected: at(-5) }), NOW)?.tone).toBe("nudge");
    expect(rowAct(row({ status: QueryStatus.QUERIED, expected: at(20) }), NOW)).toEqual({ tone: "plain", label: "Record a response", mode: "resp" });
    expect(rowAct(row({ status: QueryStatus.REJECTED }), NOW)).toBeNull();
  });
  it("tags only Your move and Gone quiet", () => {
    expect(rowTag(row({ status: QueryStatus.PARTIAL_REQUESTED }), NOW)).toBe("you");
    expect(rowTag(row({ status: QueryStatus.QUERIED, expected: at(-60) }), NOW)).toBe("quiet");
    expect(rowTag(row({ status: QueryStatus.QUERIED, expected: at(20) }), NOW)).toBeNull();
    expect(rowTag(row({ status: QueryStatus.REJECTED }), NOW)).toBeNull();
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { HkGroup } from "./todoHousekeeping";
import { ledgerTitle, ledgerDetail, sortLedgerDo, sortLedgerHk, batchChildren, batchDetail, batchTaskCopy, truncateRows, LEDGER_SECTION_CAP } from "./todoLedger";
import { Agent, Query, QueryStatus, TaskFlag } from "../types";

const NOW = Date.parse("2026-07-18T12:00:00Z");
const card = (key: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key, stream: "do", title: "T", who: "W", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "AB", record: "", committed: false, done: false, ...over } as BoardCard);
const q = (id: string, over: Partial<Query> = {}): Query => ({ id, agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, ...over } as Query);
const flag = (over: Partial<TaskFlag>): TaskFlag => ({ id: "f", userId: "u", taskType: "data_quality_poor", snoozeCount: 0, ...over } as TaskFlag);

describe("ledgerTitle — the terse row voice (cards keep their own titles)", () => {
  it("maps every derived type; user tasks keep the writer's words", () => {
    expect(ledgerTitle(card("k", { taskType: "offer_received" }))).toBe("Review offer");
    expect(ledgerTitle(card("k", { taskType: "partial_requested" }))).toBe("Send partial");
    expect(ledgerTitle(card("k", { taskType: "full_requested" }))).toBe("Send full");
    expect(ledgerTitle(card("k", { taskType: "revise_resubmit" }))).toBe("Resubmit R&R");
    expect(ledgerTitle(card("k", { taskType: "nudge_overdue" }))).toBe("Send a nudge");
    expect(ledgerTitle(card("k", { taskType: "no_response_close" }))).toBe("Consider closing");
    expect(ledgerTitle(card("k", { userTaskId: "u1", title: "Ring the printers" }))).toBe("Ring the printers");
  });
});

describe("ledgerDetail — per-type DETAIL, consuming the card's own sources", () => {
  it("offer → REPLY BY {date} (hot), sorted by the deadline; unset deadline → the dim dash at the far end (A2)", () => {
    const c = card("o", { taskType: "offer_received", relatedRecordId: "q1" });
    const d = ledgerDetail(c, { queries: [q("q1", { responseDeadline: "2026-07-31T00:00:00.000Z" })], taskFlags: [] }, NOW);
    expect(d.label).toBe("REPLY BY 31 JUL");
    expect(d.tone).toBe("hot");
    expect(d.sortMs).toBe(Date.parse("2026-07-31T00:00:00.000Z"));
    expect(ledgerDetail(c, { queries: [q("q1")], taskFlags: [] }, NOW)).toEqual({ label: "—", tone: "dim", sortMs: Number.MAX_SAFE_INTEGER });
  });
  it("a QUIET offer shows its wake date (the one visible-while-snoozed case)", () => {
    const c = card("o", { taskType: "offer_received", relatedRecordId: "q1", quiet: true });
    const d = ledgerDetail(c, {
      queries: [q("q1", { responseDeadline: "2026-07-31T00:00:00.000Z" })],
      taskFlags: [flag({ taskType: "offer_received", queryId: "q1", snoozedUntil: "2026-07-21T12:00:00.000Z" })],
    }, NOW);
    expect(d.label).toBe("WAKES 21 JUL");
    expect(d.sortMs).toBe(Date.parse("2026-07-21T12:00:00.000Z"));
  });
  it("sends → REQUESTED {date} from lastStatusChange (the request status IS the current status); R&R gets its own voice", () => {
    const send = card("s", { taskType: "full_requested", relatedRecordId: "q1" });
    const rr = card("r", { taskType: "revise_resubmit", relatedRecordId: "q1" });
    const ctx = { queries: [q("q1", { lastStatusChange: "2026-07-12T09:00:00.000Z" })], taskFlags: [] };
    expect(ledgerDetail(send, ctx, NOW).label).toBe("REQUESTED 12 JUL");
    expect(ledgerDetail(rr, ctx, NOW).label).toBe("R&R FROM 12 JUL");
  });
  it("stale/nudge → QUIET {n} DAYS from the SAME ambient source the card title reads", () => {
    const c = card("st", { taskType: "no_response_close", relatedRecordId: "q1" });
    const sent = new Date(NOW - 100 * 86400000).toISOString();
    const d = ledgerDetail(c, { queries: [q("q1", { dateSent: sent })], taskFlags: [] }, NOW);
    expect(d.label).toBe("QUIET 100 DAYS");
    expect(d.sortMs).toBe(NOW - 100 * 86400000);
  });
  it("notes/user tasks fall back to the card's own chip", () => {
    const c = card("n", { userTaskId: "u1", due: "Note · 6 Jul" });
    expect(ledgerDetail(c, { queries: [], taskFlags: [] }, NOW).label).toBe("NOTE · 6 JUL");
  });
});

describe("DETAIL ↓ defaults", () => {
  it("Urgent: offers pinned first (board law), then due-soonest ascending", () => {
    const queries = [
      q("qo", { responseDeadline: "2026-08-20T00:00:00.000Z" }),
      q("qa", { lastStatusChange: "2026-07-16T00:00:00.000Z" }),
      q("qb", { lastStatusChange: "2026-07-02T00:00:00.000Z" }),
    ];
    const rows = sortLedgerDo([
      card("a", { taskType: "full_requested", relatedRecordId: "qa" }),
      card("b", { taskType: "revise_resubmit", relatedRecordId: "qb" }),
      card("o", { taskType: "offer_received", relatedRecordId: "qo" }),
    ], { queries, taskFlags: [] }, NOW);
    expect(rows.map((r) => r.key)).toEqual(["o", "b", "a"]); // offer pinned; 2 Jul before 16 Jul
  });
  it("Housekeeping: longest-quiet first", () => {
    const queries = [
      q("q1", { dateSent: new Date(NOW - 300 * 86400000).toISOString() }),
      q("q2", { dateSent: new Date(NOW - 700 * 86400000).toISOString() }),
    ];
    const rows = sortLedgerHk([
      card("s1", { taskType: "no_response_close", relatedRecordId: "q1" }),
      card("s2", { taskType: "no_response_close", relatedRecordId: "q2" }),
    ], { queries, taskFlags: [] }, NOW);
    expect(rows.map((r) => r.key)).toEqual(["s2", "s1"]);
  });
});

describe("batchChildren — the full cohort (grant 2's degrade on done dates)", () => {
  const member = (id: string, name: string): HkGroup["members"][number] =>
    ({ card: card(`m-${id}`, { initials: name.slice(0, 2).toUpperCase() }), agentName: name, agency: "Agency", agentId: id, queried: true });
  const group: HkGroup = { rule: "dq_mswl", meta: { rule: "dq_mswl", need: "mswl", taskType: "data_quality_poor", label: "Wish lists", title: (n: number) => `${n}`, assistable: true } as HkGroup["meta"], members: [member("a1", "Aisha Kapoor")] };
  const agents = [
    { id: "a1", name: "Aisha Kapoor", agency: "Kapoor & Fray", mswlNotes: "" },
    { id: "a2", name: "Priya Raman", agency: "Raman Literary", mswlNotes: "loves crime" }, // complete, flow-stamped
    { id: "a3", name: "Will Tan", agency: "Tan Literary", mswlNotes: "quiet horror" },     // complete, never flagged
    { id: "a4", name: "Marcus Reed", agency: "Bloomsbury", mswlNotes: "" },               // gap but item-muted (not a member)
  ] as unknown as Agent[];
  const flags = [flag({ agentId: "a2", resolvedAt: "2026-07-17T10:00:00.000Z" })];

  it("recorded-first, then members (group order), then muted gap agents; every agent appears once", () => {
    const kids = batchChildren(group, agents, flags);
    expect(kids.map((k) => k.name)).toEqual(["Priya Raman", "Will Tan", "Aisha Kapoor", "Marcus Reed"]);
    expect(kids.map((k) => k.done)).toEqual([true, true, false, false]);
  });
  it("✓ RECORDED is dated ONLY where the flow stamped resolvedAt — undated otherwise, never invented", () => {
    const kids = batchChildren(group, agents, flags);
    expect(kids[0].doneDate).toBe("17 Jul"); // Priya — stamped
    expect(kids[1].doneDate).toBe("");       // Will — complete from the start, no date exists
  });
  it("batchDetail = the cohort progress caption", () => {
    expect(batchDetail(group, 4)).toEqual({ pct: 75, caption: "3 OF 4" });
  });
});

describe("truncateRows — SHOW ALL caps (top-level rows only)", () => {
  const rows = Array.from({ length: 12 }, (_, i) => i);
  it("caps at 8 with the hidden count; expanded shows all; ≤cap passes through", () => {
    expect(truncateRows(rows, false)).toEqual({ visible: rows.slice(0, LEDGER_SECTION_CAP), hidden: 4 });
    expect(truncateRows(rows, true)).toEqual({ visible: rows, hidden: 0 });
    expect(truncateRows([1, 2], false)).toEqual({ visible: [1, 2], hidden: 0 });
  });
});

describe("A2 — bare type echoes banned; unreadable dates render the dim dash", () => {
  it("offer / send / R&R with no readable date → dim — (sort keys unchanged at the far end)", () => {
    const ctx = { queries: [q("q1")], taskFlags: [] }; // no dates on the record at all
    for (const t of ["offer_received", "full_requested", "partial_requested", "revise_resubmit"]) {
      const d = ledgerDetail(card("k", { taskType: t, relatedRecordId: "q1" }), ctx, NOW);
      expect(d.label).toBe("—");
      expect(d.tone).toBe("dim");
      expect(d.sortMs).toBe(Number.MAX_SAFE_INTEGER);
    }
    // and a truly unparsable stored date degrades identically, never echoing the type
    const bad = { queries: [q("q1", { responseDeadline: "not-a-date", lastStatusChange: "junk" })], taskFlags: [] };
    expect(ledgerDetail(card("k", { taskType: "offer_received", relatedRecordId: "q1" }), bad, NOW).label).toBe("—");
    expect(ledgerDetail(card("k", { taskType: "full_requested", relatedRecordId: "q1" }), bad, NOW).label).toBe("—");
  });
  it("batch copy snapshots — the ref's wording, one source", () => {
    expect(batchTaskCopy("dq_materials")).toBe("Add material requirements");
    expect(batchTaskCopy("dq_mswl")).toBe("Add wish lists");
    expect(batchTaskCopy("dq_responseTime")).toBe("Add reply windows");
  });
  it("REGRESSION: the ledger layer is strictly 1:1 with its input — no fan-out, no dedup (duplicate agents = duplicate RECORDS)", () => {
    // two queries to the same agent, same dateSent → two rows, same quiet-days, distinct keys
    const sent = new Date(NOW - 300 * 86400000).toISOString();
    const queries = [q("q1", { dateSent: sent }), q("q2", { agentId: "a1", dateSent: sent })];
    const rows = sortLedgerHk([
      card("s1", { taskType: "no_response_close", relatedRecordId: "q1", who: "Eleanor Whitfield" }),
      card("s2", { taskType: "no_response_close", relatedRecordId: "q2", who: "Eleanor Whitfield" }),
    ], { queries, taskFlags: [] }, NOW);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
    expect(ledgerDetail(rows[0], { queries, taskFlags: [] }, NOW).label).toBe(ledgerDetail(rows[1], { queries, taskFlags: [] }, NOW).label);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · Phase 1 — the reply that sits between steps. Each lock runs the REAL readers (recomputeFields,
 * buildQcRows, queryState, qc151/qc153) over a query WITH and WITHOUT an entry and asserts what moved. Every "moves"
 * lock was proved red with its read removed (reports/controls-entry-v1/REPORT.md, Phase 1).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  AGENT_REPLY_NESTED_TYPE, AGENT_REPLY_TYPE, LEGACY_HOLDING_NESTED_TYPE, LEGACY_HOLDING_TYPE, REPLY_KINDS,
  buildAgentReplyWrites, readFeedReply, readNestedReply, replyDateLine, replyPhrase, replyTitle, type ReplyKind,
} from "./agentReply";
import { computeRecomputedFields } from "./recomputeFields";
import { buildQcRows, type QcRow } from "./qcSummary";
import { queryState, stampRows, type Stamped } from "./queryState";
import { lastHeardMs } from "./qc151";
import { heardFact, scheduledNudgeMs } from "./qc153";
import { Activity, Agent, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 24, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const noonOf = (ms: number) => new Date(new Date(ms).setHours(12, 0, 0, 0)).getTime();
const agent: Agent = { id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8 } as Agent;
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(200), ...over,
} as Query);
const statusAct = (q: Query, s: QueryStatus, date: string): Activity =>
  ({ id: `${q.id}-${s}`, userId: "u", queryId: q.id, manuscriptId: "m1", activityType: "Status Changed" as never, description: "", details: "", date, resultingStatus: s });
/** the entry's feed twin, built by the real builder */
const entry = (q: Query, kind: ReplyKind, daysAgo: number, dateYmd?: string | null, words?: string): Activity => {
  const w = buildAgentReplyWrites(q, agent, { kind, on: ago(daysAgo), date: dateYmd ?? null, words });
  return { ...(w.activity as Activity), id: `e-${q.id}-${daysAgo}`, userId: "u" };
};
const rowOf = (q: Query, acts: Activity[]): QcRow & Stamped => stampRows(buildQcRows([q], [agent], acts, NOW), [agent], { quietWeeks: 4, nowMs: NOW })[0];

describe("the type is one, and never a status", () => {
  it("one nested type, one feed type, three kinds — and neither type is a QueryStatus member", () => {
    expect(REPLY_KINDS).toEqual(["chaser", "holding", "note"]);
    expect(Object.values(QueryStatus)).not.toContain(AGENT_REPLY_NESTED_TYPE as never);
    expect(Object.values(QueryStatus)).not.toContain(AGENT_REPLY_TYPE as never);
    const w = buildAgentReplyWrites(mkQ(), agent, { kind: "chaser", on: ago(1), date: "2026-12-04", words: "Any news?" });
    expect("resultingStatus" in w.nested).toBe(false);
    expect("resultingStatus" in w.activity).toBe(false);
    expect(w.nested).toMatchObject({ type: "Agent reply", replyKind: "chaser", replyDate: "2026-12-04", replyNote: "Any news?" });
    expect(w.activity).toMatchObject({ activityType: "Agent Reply", replyKind: "chaser", replyDate: "2026-12-04", details: "Any news?" });
  });

  it.each(REPLY_KINDS)("a %s, dated or not, moves NOTHING recomputeQuery writes", (kind) => {
    const q = mkQ();
    const log = [
      { id: "s1", data: { type: QueryStatus.QUERIED, resultingStatus: QueryStatus.QUERIED, createdAt: ago(200), note: "" } },
      { id: "s2", data: { type: QueryStatus.FULL_REQUESTED, resultingStatus: QueryStatus.FULL_REQUESTED, createdAt: ago(30), note: "" } },
    ];
    const before = computeRecomputedFields(log as never);
    for (const date of [null, ymd(NOW + 10 * DAY)]) {
      const e = { id: "e1", data: buildAgentReplyWrites(q, agent, { kind, on: ago(3), date }).nested };
      expect(computeRecomputedFields([...log, e] as never), `${kind} moved a derived field`).toEqual(before);
    }
    expect(before.status).toBe(QueryStatus.FULL_REQUESTED);
  });
});

describe("Last heard — set by the entry, on both readers", () => {
  it("the Query Centre's Last heard is the entry's day, and names it", () => {
    const q = mkQ({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(30) });
    const acts = [statusAct(q, QueryStatus.QUERIED, ago(200)), statusAct(q, QueryStatus.FULL_REQUESTED, ago(30))];
    const without = rowOf(q, acts);
    const withE = rowOf(q, [...acts, entry(q, "chaser", 3, ymd(NOW + 10 * DAY))]);
    expect(lastHeardMs(without)).toBe(Date.parse(ago(30)));
    expect(lastHeardMs(withE), "the entry did not set Last heard").toBe(Date.parse(ago(3)));
    expect(heardFact(withE, NOW).line).toBe("chased the full");
  });
});

describe("with a date — Send by, Reply expected, the reminder", () => {
  it("with you: a chaser's date becomes Send by", () => {
    const q = mkQ({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(30), expectedSendDate: ago(-3) });
    const acts = [statusAct(q, QueryStatus.FULL_REQUESTED, ago(30))];
    const date = ymd(NOW + 10 * DAY);
    expect(rowOf(q, acts).expectedMs).toBe(Date.parse(ago(-3)));
    expect(rowOf(q, [...acts, entry(q, "chaser", 2, date)]).expectedMs, "Send by did not follow the entry").toBe(Date.parse(`${date}T12:00:00`));
  });

  it("with the agent: a holding reply's date becomes Reply expected — and a writer's date set after it still wins", () => {
    const q = mkQ({ dateSent: ago(200) });
    const date = ymd(NOW + 40 * DAY);
    const e = entry(q, "holding", 5, date);
    expect(rowOf(q, []).expectedMs).toBe(Date.parse(ago(200)) + 8 * 7 * DAY);
    expect(rowOf(q, [e]).expectedMs, "Reply expected did not follow the entry").toBe(Date.parse(`${date}T12:00:00`));
    const later = { ...q, writerExpectedDate: ago(-60), writerExpectedSetAt: ago(1) } as Query;
    expect(rowOf(later, [e]).expectedMs).toBe(Date.parse(ago(-60)));
  });

  it("an entry from before the latest send does not move this wait", () => {
    const q = mkQ({ status: QueryStatus.FULL_SENT, dateSent: ago(200), fullSentDate: ago(10) });
    expect(rowOf(q, [entry(q, "holding", 20, ymd(NOW + 40 * DAY))]).expectedMs).toBe(Date.parse(ago(10)) + 12 * 7 * DAY);
  });

  it("the writer's reminder that falls before the new date reads as due on it", () => {
    const q = mkQ({ dateSent: ago(200), nudgeDate: ymd(NOW + 2 * DAY) } as Partial<Query>);
    const date = ymd(NOW + 30 * DAY);
    expect(scheduledNudgeMs(rowOf(q, []), NOW)).toBe(Date.parse(`${ymd(NOW + 2 * DAY)}T12:00:00`));
    expect(scheduledNudgeMs(rowOf(q, [entry(q, "holding", 1, date)]), NOW), "the reminder did not read through the entry").toBe(Date.parse(`${date}T12:00:00`));
    /* a reminder already after the new date stays where the writer put it */
    const late = mkQ({ dateSent: ago(200), nudgeDate: ymd(NOW + 50 * DAY) } as Partial<Query>);
    expect(scheduledNudgeMs(rowOf(late, [entry(late, "holding", 1, date)]), NOW)).toBe(Date.parse(`${ymd(NOW + 50 * DAY)}T12:00:00`));
  });
});

describe("Gone quiet — reset by any entry, dated or not", () => {
  it("a note with no date ends Gone quiet and moves no date", () => {
    const q = mkQ({ dateSent: ago(200) });
    const without = rowOf(q, []);
    const withE = rowOf(q, [entry(q, "note", 2, null, "Away until 7 December.")]);
    expect(without.qs).toBe("quiet");
    expect(withE.qs, "the entry did not end Gone quiet").not.toBe("quiet");
    expect(withE.expectedMs).toBe(without.expectedMs);
    /* a full quiet window after it, it is Gone quiet again */
    const old = rowOf(q, [entry(q, "note", 60, null)]);
    expect(old.qs).toBe("quiet");
    expect(queryState({ ...withE, nrmn: false }, { quietWeeks: 4, nowMs: NOW })).toBe("nudge");
  });
});

describe("the holding-reply pack's rows read as kind holding", () => {
  it("nested: their weeks become the date, counted from the entry's own date; their words come out of the prose", () => {
    const at = Date.parse(ago(4));
    const r = readNestedReply({ type: LEGACY_HOLDING_NESTED_TYPE, createdAt: ago(4), replyWeeks: 2, note: "They expect to reply within 2 weeks · \"Sorry for the delay.\"" });
    expect(r).toMatchObject({ kind: "holding", ms: at, words: "Sorry for the delay." });
    expect(r!.dateMs).toBe(noonOf(at + 14 * DAY));
  });
  it("feed: the same, from details", () => {
    const at = Date.parse(ago(4));
    const r = readFeedReply({ activityType: LEGACY_HOLDING_TYPE as never, date: ago(4), details: "They expect to reply within 3 weeks" });
    expect(r).toMatchObject({ kind: "holding", ms: at, words: null, dateMs: noonOf(at + 21 * DAY) });
    expect(readFeedReply({ activityType: LEGACY_HOLDING_TYPE as never, date: ago(4), details: "\"Still reading.\"" })).toMatchObject({ dateMs: null, words: "Still reading." });
  });
  it("and a legacy row moves the Query Centre's date like a new one", () => {
    const q = mkQ({ dateSent: ago(200) });
    const legacy = { id: "h1", userId: "u", queryId: q.id, manuscriptId: "m1", activityType: LEGACY_HOLDING_TYPE as never, description: "", date: ago(4), details: "They expect to reply within 2 weeks" } as Activity;
    expect(rowOf(q, [legacy]).expectedMs).toBe(noonOf(Date.parse(ago(4)) + 14 * DAY));
  });
});

describe("the words (baked)", () => {
  it("titles, phrases and date lines", () => {
    expect(replyTitle("chaser", "Jonathan", "partial")).toBe("Jonathan chased the partial");
    expect(replyTitle("chaser", "Jonathan", "full")).toBe("Jonathan chased the full");
    expect(replyTitle("chaser", "Jonathan", "revision")).toBe("Jonathan chased the revision");
    expect(replyTitle("holding", "Jonathan", null)).toBe("Jonathan sent a holding reply");
    expect(replyTitle("note", "Jonathan", "full")).toBe("Jonathan sent a note");
    expect(replyPhrase("chaser", "full")).toBe("when chasing the full");
    expect(replyPhrase("holding", null)).toBe("in a holding reply");
    expect(replyPhrase("note", null)).toBe("in a note");
    expect(replyDateLine(Date.UTC(2026, 11, 4, 12), true)).toBe("Send by Fri 4 Dec");
    expect(replyDateLine(Date.UTC(2027, 0, 15, 12), false)).toBe("Reply expected by 15 Jan");
    expect(replyDateLine(null, true)).toBeNull();
  });
});

describe("corrected only through editActivity and deleteActivity", () => {
  const src = (p: string) => readFileSync(p, "utf8");
  it("editActivity maps the kind, the date and the words onto both stores", () => {
    const db = src("src/lib/db.tsx");
    const body = db.slice(db.indexOf("const editActivity = async"), db.indexOf("// User Profile updater"));
    expect(body).toContain("subPatch[REPLY_KIND_FIELD] = r.kind; feedPatch[REPLY_KIND_FIELD] = r.kind;");
    expect(body).toContain("subPatch[REPLY_DATE_FIELD]");
    expect(body).toContain("feedPatch.details");
  });
  it("nothing else in src writes the entry's keys (the builder and editActivity only)", () => {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const hits = execSync("grep -rlE 'REPLY_DATE_FIELD|replyDate:' src --include=*.ts --include=*.tsx || true", { encoding: "utf8" })
      .split("\n").filter(Boolean).filter((f) => !/\.test\.tsx?$/.test(f));
    expect(hits.sort()).toEqual(["src/lib/agentReply.ts", "src/lib/db.tsx"]);
  });
  it("a deleted entry leaves nothing behind: every value is read from the entry, none is stored", () => {
    const q = mkQ({ dateSent: ago(200) });
    const e = entry(q, "holding", 5, ymd(NOW + 40 * DAY));
    expect(rowOf(q, [e]).expectedMs).not.toBe(rowOf(q, []).expectedMs);
    const w = buildAgentReplyWrites(q, agent, { kind: "holding", on: ago(5), date: ymd(NOW + 40 * DAY) });
    expect(Object.keys(w).sort()).toEqual(["activity", "nested"]);
  });
});

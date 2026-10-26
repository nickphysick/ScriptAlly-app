/**
 * DASHBOARD v71 — the task card's model (the pure half of C1–C3; the rendered half is
 * tests/e2e/dashV71.measure.ts). The Query Centre's rows are built by `buildQcRows` from real query
 * documents, never written by hand, so the dates the card reads are the ones the app derives.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import type { ListGroupKey, ListItem } from "./dashList";
import { buildQcRows } from "./qcSummary";
import { KIND_STYLE, closeThresholdMs, kindOf, segmentWindow, spanWords, taskCardModel } from "./dashTaskCard";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-26T12:00:00Z");
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const agent = (id: string, name: string, agency: string, weeks: number, extra: Partial<Agent> = {}): Agent =>
  ({ id, name, agency, responseTimeWeeks: weeks, noResponseMeansNo: false, ...extra }) as unknown as Agent;
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "ms", status, ...extra }) as unknown as Query;
const item = (group: ListGroupKey, queryId: string, who: string, taskType: string | null, extra: Partial<ListItem> = {}): ListItem => ({
  key: `${group}:${queryId}`, group, tone: "queried", pre: "x ", who, post: "", initials: "AB", fact: "", agency: "AGENCY",
  status: null, when: "", foot: "", actLabel: "", action: { kind: "drawer", request: { mode: "nudge", queryId } }, stages: null,
  note: null, date: null, taskType, ...extra,
});

const priya = agent("a1", "Priya Raman", "Raman & Hale", 6);
const tom = agent("a2", "Tom Okafor", "Okafor Literary", 4);
const jon = agent("a3", "Jonathan Marsh", "The Marsh Agency", 8);
const qNudge = query("q1", "a1", QueryStatus.QUERIED, { dateSent: iso(84) });
const qClose = query("q2", "a2", QueryStatus.QUERIED, { dateSent: iso(105) });
const qSend = query("q3", "a3", QueryStatus.FULL_REQUESTED, { dateSent: iso(200), fullRequestedDate: iso(63) } as Partial<Query>);
const queries = [qNudge, qClose, qSend];
const agents = [priya, tom, jon];
const ctx = { queries, agents, qcRows: buildQcRows(queries, agents, [], NOW), nowMs: NOW };

describe("the kind of each item", () => {
  it("nudge, close and the three sends; every other item keeps v60.1's label", () => {
    expect(kindOf({ group: "nudge", taskType: "nudge_overdue" })).toBe("nudge");
    expect(kindOf({ group: "quiet", taskType: "no_response_close" })).toBe("close");
    for (const t of ["partial_requested", "full_requested", "revise_resubmit", "offer_send_full"]) expect(kindOf({ group: "req", taskType: t })).toBe("send");
    expect(kindOf({ group: "req", taskType: "offer_received" })).toBe("other");
    expect(kindOf({ group: "house", taskType: null })).toBe("other");
    const other = taskCardModel(item("house", "x", "", null, { pre: "Add genres for ", who: "Ann", action: { kind: "route", tab: "agents" } }), "Housekeeping", ctx);
    expect([other.kicker, other.tint, other.plain]).toEqual(["HOUSEKEEPING", "#f1eee9", "add genres for Ann"]);
  });
});

describe("C1 — kickers, tints, accents and titles, as tabled", () => {
  it("nudge", () => {
    const m = taskCardModel(item("nudge", "q1", "Priya Raman", "nudge_overdue"), "Worth a nudge", ctx);
    expect([m.kicker, m.tint, m.accent, `${m.pre}${m.who}${m.post}`]).toEqual(["TIME TO NUDGE", "#e8eef6", "#2a3a52", "Nudge Priya Raman"]);
    expect(m.line).toMatch(/^No reply since you queried on \d+ [A-Z][a-z]+\. Priya’s usual reply time is six weeks\.$/);
    expect(m.line).not.toMatch(/\b(he|she|his|her)\b/i);
  });
  it("close — the title is exactly 'Close your query to {Name}?'", () => {
    const m = taskCardModel(item("quiet", "q2", "Tom Okafor", "no_response_close"), "Gone quiet", ctx);
    expect([m.kicker, m.tint, m.accent]).toEqual(["CONSIDER CLOSING", "#efebe5", "#7d7064"]);
    expect(`${m.pre}${m.who}${m.post}`).toBe("Close your query to Tom Okafor?");
    expect(m.line).toBe("Fifteen weeks without a reply, eleven past the expected date. Closing it keeps your pipeline honest, and you can reopen it any time.");
  });
  it("send", () => {
    const m = taskCardModel(item("req", "q3", "Jonathan Marsh", "full_requested"), "Agents are waiting", ctx);
    expect([m.kicker, m.tint, m.accent, `${m.pre}${m.who}`]).toEqual(["YOUR MOVE · SEND", "#f4e7e1", "#a2452a", "Send your full to Jonathan Marsh"]);
    expect(m.line).toMatch(/^The Marsh Agency asked for the full on \d+ [A-Z][a-z]+\. It’s been with you nine weeks\.$/);
    expect(KIND_STYLE.send.kicker).toBe("YOUR MOVE · SEND");
  });
});

describe("C2 — the reply-window bar", () => {
  it("nudge: solid from the send to the expected date, as a share of send → today", () => {
    const m = taskCardModel(item("nudge", "q1", "Priya Raman", "nudge_overdue"), "", ctx);
    const b = m.bar!;
    expect(b.expectedMs).not.toBeNull();
    expect(b.solid).toBeCloseTo((b.expectedMs! - b.sentMs) / (NOW - b.sentMs), 6);
    expect(b.solid).toBeCloseTo(0.5, 1); // six weeks of a twelve-week wait
    expect(b.close).toBeNull();
    expect(b.todayLabel).toBe("Today · 12 wks");
    expect(b.expectedLabel).toMatch(/^Expected \d+ [A-Z][a-z]{2}$/);
  });
  it("close: the threshold is the board's own rule, marked on the bar", () => {
    const m = taskCardModel(item("quiet", "q2", "Tom Okafor", "no_response_close"), "", ctx);
    const b = m.bar!;
    /* four-week window, never nudged: the ceiling is max(2 × 4 weeks, 90 days) after the send */
    expect(b.closeMs).toBe(Date.parse(qClose.dateSent!) + 90 * DAY);
    expect(b.close).toBeCloseTo((b.closeMs! - b.sentMs) / (NOW - b.sentMs), 6);
    expect(b.closeLabel).toMatch(/^CLOSE AFTER \d+ WKS PAST$/);
    expect(b.expectedLabel).toBeNull();
  });
  it("the threshold follows a plan, a stated pass, and an ignored nudge", () => {
    const sent = NOW - 100 * DAY;
    expect(closeThresholdMs(query("p", "a", QueryStatus.QUERIED, { closePlan: iso(3) }), tom, sent, null)).toBe(Date.parse(iso(3)));
    expect(closeThresholdMs(query("s", "a", QueryStatus.QUERIED, { dateSent: iso(100) }), agent("x", "X", "", 4, { noResponseMeansNo: true }), sent, NOW - 72 * DAY)).toBe(NOW - 72 * DAY + 14 * DAY);
    expect(closeThresholdMs(query("n", "a", QueryStatus.QUERIED, { dateSent: iso(100), lastNudgeSentDate: iso(50) }), tom, sent, null)).toBe(Date.parse(iso(50)) + 28 * DAY);
  });
});

describe("C3 — the step chips: the step still to do is the last, and not done", () => {
  it("send", () => {
    const m = taskCardModel(item("req", "q3", "Jonathan Marsh", "full_requested"), "", ctx);
    const steps = m.steps!;
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.slice(0, -1).every((s) => s.done)).toBe(true);
    expect(steps.at(-1)).toEqual({ label: "Full sent", date: "—", done: false });
    expect(steps.at(-2)?.label).toBe("Full requested");
  });
});

describe("words and segments", () => {
  it("spans are said in words", () => {
    expect(spanWords(63 * DAY)).toBe("nine weeks");
    expect(spanWords(4 * DAY)).toBe("four days");
    expect(spanWords(7 * DAY)).toBe("seven days");
    expect(spanWords(14 * DAY)).toBe("two weeks");
  });
  it("at most twelve segments, the current one in view", () => {
    expect(segmentWindow(5, 3)).toEqual({ start: 0, count: 5 });
    for (let i = 0; i < 30; i++) {
      const w = segmentWindow(30, i);
      expect(w.count).toBe(12);
      expect(i >= w.start && i < w.start + w.count).toBe(true);
    }
  });
});

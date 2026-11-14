/**
 * Two-door import v1 — the rules' locks (unit). Each lock's mutation is a named source break in
 * scripts/tdi-mutate.mjs; readings are in reports/two-door-import/.
 *   R1  each settlement rule: input → saved value → "Sorted for you" count; a zero renders no line.
 *   R2  a status that disagrees with its dates is overruled by the dates.
 *   Q3  a blank agency and a missing sent date open no question; a nameless agent and a two-way date still do.
 *   Q1  (model half) the out-of-order question holds until the dates run in order, then takes them.
 *   Q2  (model half) each new question opens the gate when present and closes it when answered.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../types";
import type { ParsedAgent, ParsedQuery, SmartImportResult } from "../types/smartImport";
import { parseModel, modelToResult, type ReviewQuery } from "./smartImportReviewModel";
import { applyImportRules, readNoYear, monthFirstReading, datesOutOfOrder, statusFromDates, answerOutcome, confirmOrder, orderSentence, OUTCOME_CHOICES, OUTCOME_WORDS, DATE_CONFIRM_WORDS, SORTED_LINES } from "./importRules";
import { openAgentQuestions, openQueryQuestions } from "./reviewGate";
import { parseTemplateRows } from "./templateImport";
import { ImportOverview } from "../components/onboarding/ImportOverview";
import { editEvent } from "./importTimeline";

const TODAY = "2026-11-14";
const agent = (p: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: "a1", name: "Clara Voss", agency: "Pemberton Literary", responseTimeWeeks: 6, ...p });
const query = (p: Partial<ParsedQuery> = {}): ParsedQuery => ({ agentRef: "a1", status: QueryStatus.QUERIED, sentDate: "2026-03-01", ...p });
const file = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ agents, queries });
const ruled = (r: SmartImportResult) => applyImportRules(parseModel(r), TODAY);
const countOf = (r: ReturnType<typeof ruled>, kind: string) => r.settled.find((s) => s.kind === kind)?.count ?? 0;
const sorted = (r: SmartImportResult) => renderToStaticMarkup(<ImportOverview result={r} manuscriptTitle="T" onContinue={() => {}} />);

describe("R1 each settlement rule: input → saved value → count", () => {
  it("status from dates: a Queried status with a dated full request is saved as Full requested", () => {
    const r = ruled(file([agent()], [query({ timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-04-02", raw: null }] })]));
    expect(r.queries[0].status).toBe(QueryStatus.FULL_REQUESTED);
    expect(countOf(r, "status-from-dates")).toBe(1);
  });
  it("request added: a full sent with no request recorded is listed, and the commit writes the request undated", () => {
    const f = file([agent()], [query({ status: QueryStatus.FULL_SENT })]);
    const r = ruled(f);
    expect(countOf(r, "request-added")).toBe(1);
    const out = modelToResult(f, r.agents, r.queries).queries[0];
    expect(out.status).toBe(QueryStatus.FULL_SENT);
    expect((out.timeline ?? []).some((e) => e.type === QueryStatus.FULL_REQUESTED), "the request is not invented as a dated step").toBe(false);
  });
  it("agency blank: a named agent with no agency is saved with none, and asks nothing", () => {
    const r = ruled(file([agent({ agency: "" })], [query()]));
    expect(r.agents[0].agency).toBe("");
    expect(r.agents[0].agencyWaived).toBe(true);
    expect(countOf(r, "agency-blank")).toBe(1);
  });
  it("sent undated: no sent date and nothing in the cell is saved undated, and asks nothing", () => {
    const r = ruled(file([agent()], [query({ sentDate: null })]));
    expect(r.queries[0].sentDate).toBeNull();
    expect(r.queries[0].sentWaived).toBe(true);
    expect(countOf(r, "sent-undated")).toBe(1);
  });
  it("response time: an agent with none in the file is left not known (listed only)", () => {
    const r = ruled(file([agent({ responseTimeWeeks: undefined })], [query()]));
    expect(r.agents[0].weeks).toBeNull();
    expect(countOf(r, "response-time")).toBe(1);
  });
  it("no year: 22/9 is read as the most recent 22 September, and its question goes", () => {
    const t = parseTemplateRows([{ "Agent name": "Clara Voss", Agency: "Pemberton", Status: "Queried", "Date sent": "22/9" }]);
    expect(t.result.queries[0].reasons).toContain("unreadable-date");
    const r = ruled(t.result);
    expect(r.queries[0].sentDate).toBe("2026-09-22");
    expect(r.queries[0].reasons.filter((x) => !x.resolved)).toEqual([]);
    expect(countOf(r, "no-year")).toBe(1);
    expect(readNoYear("15 Dec", TODAY), "a day still to come this year is last year's").toBe("2025-12-15");
    expect(readNoYear("22/9/2026", TODAY), "a date with a year is not this rule's").toBeNull();
  });
  it("a count of 0 renders no line, and every settled kind renders its words", () => {
    const clean = file([agent()], [query()]);
    expect(ruled(clean).settled).toEqual([]);
    expect(sorted(clean)).not.toContain('data-im="sorted"');
    const busy = file([agent({ agency: "", responseTimeWeeks: undefined })], [query({ sentDate: null, status: QueryStatus.FULL_SENT })]);
    const h = sorted(busy);
    for (const k of ["agency-blank", "sent-undated", "response-time", "request-added"] as const) {
      expect(h).toContain(`data-sorted="${k}"`);
      expect(h).toContain(SORTED_LINES[k].title);
    }
    expect(h).not.toContain('data-sorted="no-year"');
    expect(h).not.toContain('data-sorted="status-from-dates"');
  });
});

describe("R2 the dates decide the status", () => {
  it("a status that disagrees with its dates is overruled by them", () => {
    const q = { status: QueryStatus.PARTIAL_REQUESTED, timeline: [
      { type: QueryStatus.PARTIAL_REQUESTED, date: "2026-03-10", raw: null },
      { type: QueryStatus.FULL_REQUESTED, date: "2026-05-01", raw: null },
    ] };
    expect(statusFromDates(q)).toBe(QueryStatus.FULL_REQUESTED);
    const r = ruled(file([agent()], [query(q)]));
    expect(r.queries[0].status).toBe(QueryStatus.FULL_REQUESTED);
  });
  it("a blank status (read as Queried) where a later step is dated takes that step", () => {
    const r = ruled(file([agent()], [query({ status: null, timeline: [{ type: QueryStatus.PARTIAL_REQUESTED, date: "2026-03-20", raw: null }] })]));
    expect(r.queries[0].status).toBe(QueryStatus.PARTIAL_REQUESTED);
  });
  it("a status further on than its dates is not a disagreement (its own step is simply undated)", () => {
    expect(statusFromDates({ status: QueryStatus.REJECTED, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-05-01", raw: null }] })).toBe(QueryStatus.REJECTED);
  });
});

describe("Q3 what is no longer asked, and what still is", () => {
  it("a blank agency and a missing sent date open no question", () => {
    const r = ruled(file([agent({ agency: "" })], [query({ sentDate: null })]));
    expect(openAgentQuestions(r.agents)).toEqual([]);
    expect(openQueryQuestions(r.queries)).toEqual([]);
  });
  it("a nameless agent and a two-way date still do", () => {
    const t = parseTemplateRows([
      { "Agent name": "", Agency: "", Status: "Queried", "Date sent": "2026-03-01", Notes: "met at a fair" },
      { "Agent name": "Jamal Carter", Agency: "Carter & Vale", Status: "Queried", "Date sent": "03/05/2026" },
    ]);
    const r = ruled(t.result);
    expect(openAgentQuestions(r.agents).map((q) => q.ask)).toEqual(["nameless"]);
    expect(openQueryQuestions(r.queries).map((q) => q.code)).toEqual(["ambiguous-date"]);
  });
  it("an unreadable date with words in it is still asked", () => {
    const r = ruled(file([agent()], [query({ sentDate: null, sentDateRaw: "sometime in May", reasons: ["unreadable-date"] })]));
    expect(openQueryQuestions(r.queries).map((q) => q.code)).toEqual(["unreadable-date"]);
  });
});

describe("Q1 (model) dates out of order", () => {
  const kv = file([agent({ name: "Kirsten Vale", agency: "Vale" })], [query({ sentDate: "2026-08-30", timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-08-15", raw: "FULL 15/8" }] })]);
  it("is raised as the query's first question, with the mock's sentence", () => {
    const r = ruled(kv);
    expect(openQueryQuestions(r.queries).map((q) => q.code)).toEqual(["dates-out-of-order"]);
    expect(r.raised).toEqual([{ id: "q0", code: "dates-out-of-order" }]);
    expect(orderSentence(r.queries[0])).toBe("A full was requested before the query was sent.");
  });
  it("cannot be confirmed while the dates are out of order; once in order it holds the corrected dates", () => {
    const q = ruled(kv).queries[0];
    expect(confirmOrder(q), "no keep-as-given").toBe(q);
    const fixed = editEvent(q, 0, QueryStatus.FULL_REQUESTED, "2026-09-15");
    expect(datesOutOfOrder(fixed)).toBe(false);
    const done = confirmOrder(fixed);
    expect(openQueryQuestions([done])).toEqual([]);
    expect(done.timeline.find((e) => e.type === QueryStatus.FULL_REQUESTED)?.date).toBe("2026-09-15");
  });
  it("a partial sent before its request is out of order too", () => {
    expect(datesOutOfOrder({ sentDate: "2026-01-01", timeline: [
      { type: QueryStatus.PARTIAL_REQUESTED, date: "2026-02-10", raw: null }, { type: QueryStatus.PARTIAL_SENT, date: "2026-02-01", raw: null },
    ] })).toBe(true);
  });
});

describe("Q2 (model) each new question opens the gate, and its answer closes it", () => {
  it("date to confirm: 9/22/2026 proposes 22 September 2026", () => {
    expect(monthFirstReading("9/22/2026", TODAY)).toBe("2026-09-22");
    expect(monthFirstReading("9/22", TODAY), "no year: the most recent").toBe("2026-09-22");
    expect(monthFirstReading("03/05/2026", TODAY), "a two-way date keeps its own question").toBeNull();
    expect(monthFirstReading("22/09/2026", TODAY)).toBeNull();
    expect(DATE_CONFIRM_WORDS.ask("2026-09-22")).toBe("Is this 22 September 2026?");
    expect(DATE_CONFIRM_WORDS.why(22)).toBe("Dates are read day first, and there's no 22nd month.");
    expect(DATE_CONFIRM_WORDS.yes("2026-09-22"), "the app's short month, not the mock's Sept").toBe("Yes, 22 Sep 2026");
    const t = parseTemplateRows([{ "Agent name": "Owen Pryce", Agency: "Greaves", Status: "Queried", "Date sent": "9/22/2026" }]);
    const r = ruled(t.result);
    expect(openQueryQuestions(r.queries).map((q) => q.code)).toEqual(["unreadable-date"]);
  });
  it("outcome missing: a full sent with a last response asks, and an answer closes it", () => {
    const t = parseTemplateRows([{ "Agent name": "Hannah Biddle", Agency: "Greaves", Status: "Full Sent", "Date sent": "2026-08-01", "Date of last response": "09/10/2026" }]);
    // 09/10/2026 reads two ways, so that is asked first; take the day-first reading as the writer would
    const q0 = ruled(t.result).queries[0];
    expect(q0.reasons.map((r) => r.code)).toEqual(["ambiguous-response-date", "outcome-missing"]);
    const dated: ReviewQuery = { ...q0, timeline: [{ ...q0.timeline[0], date: "2026-10-09" }], reasons: q0.reasons.map((r) => (r.code === "ambiguous-response-date" ? { ...r, resolved: true } : r)) };
    expect(openQueryQuestions([dated]).map((q) => q.code)).toEqual(["outcome-missing"]);
    expect(OUTCOME_WORDS.ask(dated)).toBe("Something happened on 9 October, after the full was sent. What was it?");
    const done = answerOutcome(dated, QueryStatus.REJECTED);
    expect(openQueryQuestions([done])).toEqual([]);
    expect(done.status).toBe(QueryStatus.REJECTED);
    expect(done.timeline.map((e) => [e.type, e.date])).toEqual([[QueryStatus.FULL_SENT, null], [QueryStatus.REJECTED, "2026-10-09"]]);
  });
  it("outcome missing is not asked where the sheet names the outcome or the step is a request", () => {
    const t = parseTemplateRows([
      { "Agent name": "A", Agency: "X", Status: "Rejected", "Date sent": "2026-01-01", "Date of last response": "2026-02-01" },
      { "Agent name": "B", Agency: "Y", Status: "Partial Requested", "Date sent": "2026-01-01", "Date of last response": "2026-02-01" },
    ]);
    expect(t.result.queries.flatMap((q) => q.reasons ?? [])).toEqual([]);
  });
  it("the outcome answers are the app's four closed outcomes, with the app's labels", () => {
    expect(OUTCOME_CHOICES.map((o) => [o.label, o.status])).toEqual([
      ["Passed", QueryStatus.REJECTED], ["No response", QueryStatus.NO_RESPONSE], ["Offer", QueryStatus.OFFER], ["Withdrawn", QueryStatus.WITHDRAWN],
    ]);
  });
});

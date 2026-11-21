/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NU1 — Next up v1: the lead card's sentence, number, caption and label for each kind of task, the fixed four-stop
 * track, and the day counts (0 reads "today", days up to 60, then whole months).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import type { ListItem } from "./dashList";
import type { TaskCtx } from "./dashTaskCard";
import type { QcRow } from "./qcSummary";
import { dayFigure, daysSince, LEAD_SENTENCE_MAX, nextKind, nextLead, quietFigure, trackOf } from "./nextUp";

const NOW = new Date(2026, 10, 20, 12).getTime();
const DAY = 86_400_000;
const ago = (d: number) => NOW - d * DAY;

const agent = (o: Partial<Agent> = {}): Agent => ({ id: "a1", name: "Jonathan Marsh", agency: "The Marsh Agency", ...o } as Agent);
const query = (o: Partial<Query> = {}): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, ...o } as Query);
const row = (o: Partial<QcRow> = {}): QcRow => ({
  id: "q1", manuscriptId: "m1", court: "agent", status: QueryStatus.QUERIED, initials: "JM", agentName: "Jonathan Marsh",
  sentMs: null, lastMs: 0, stageStartMs: null, expectedMs: null, expectedKind: null, history: { spans: [], currentStartMs: null, dated: false },
  ...o,
} as unknown as QcRow);
const item = (o: Partial<ListItem>): ListItem => ({
  key: "k", group: "req", tone: "house", pre: "", who: "Jonathan Marsh", post: "", initials: "JM", fact: "", agency: "", status: null,
  when: "", foot: "", actLabel: "", action: { kind: "drawer", request: { mode: "sent", queryId: "q1" } }, stages: null, note: null, date: null,
  ...o,
} as ListItem);
const ctx = (q: Query, r: QcRow, a: Agent = agent(), more: QcRow[] = []): TaskCtx => ({ queries: [q], agents: [a], qcRows: [r, ...more], nowMs: NOW });
const spans = (...ss: [QueryStatus, number][]) => ({ spans: ss.map(([status, d]) => ({ status, startMs: ago(d), endMs: null, current: false })), currentStartMs: null, dated: true });

describe("NU1-a · day counts", () => {
  it("0 reads today with no caption; days up to 60; then whole months", () => {
    expect(dayFigure(0, "waiting")).toEqual({ value: "today", caption: null, wait: "today" });
    expect(dayFigure(1, "waiting")).toEqual({ value: "1", caption: "day waiting", wait: "1 day" });
    expect(dayFigure(60, "waiting")).toEqual({ value: "60", caption: "days waiting", wait: "60 days" });
    expect(dayFigure(61, "waiting")).toEqual({ value: "2", caption: "months waiting", wait: "2 months" });
    expect(dayFigure(400, "ago").caption).toBe("months ago");
  });
  it("gone quiet: weeks under two months, then months", () => {
    expect(quietFigure(20)).toMatchObject({ value: "3", caption: "weeks quiet" });
    expect(quietFigure(160)).toMatchObject({ value: "5", caption: "months quiet" });
    expect(quietFigure(0).caption).toBe(null);
  });
  it("whole calendar days", () => {
    expect(daysSince(ago(17), NOW)).toBe(17);
    expect(daysSince(NOW + 5 * DAY, NOW)).toBe(0);
  });
});

describe("NU1-b · the track is always four stops", () => {
  it("a full asked for straight from the query: the partial stop stays faint, Offer the outline", () => {
    const t = trackOf(QueryStatus.FULL_REQUESTED, spans([QueryStatus.QUERIED, 30], [QueryStatus.FULL_REQUESTED, 17]).spans);
    expect(t.cur).toBe(2);
    expect(t.stops.map((s) => [s.status, s.reached])).toEqual([
      [QueryStatus.QUERIED, true], [QueryStatus.PARTIAL_SENT, false], [QueryStatus.FULL_REQUESTED, true], [QueryStatus.OFFER, false],
    ]);
  });
  it("a long history is still four stops; a revision is the arrows mark on the Full stop", () => {
    const t = trackOf(QueryStatus.REVISE_RESUBMIT, spans([QueryStatus.QUERIED, 90], [QueryStatus.PARTIAL_REQUESTED, 80], [QueryStatus.PARTIAL_SENT, 70],
      [QueryStatus.FULL_REQUESTED, 50], [QueryStatus.FULL_SENT, 40], [QueryStatus.REVISE_RESUBMIT, 9]).spans);
    expect(t.stops).toHaveLength(4);
    expect(t.stops[1]).toEqual({ status: QueryStatus.PARTIAL_SENT, reached: true });
    expect(t.stops[2]).toEqual({ status: QueryStatus.REVISE_RESUBMIT, reached: true });
    expect(t.cur).toBe(2);
  });
  it("an offer completes it", () => {
    expect(trackOf(QueryStatus.OFFER, []).cur).toBe(3);
    expect(trackOf(QueryStatus.OFFER, []).stops[3]).toEqual({ status: QueryStatus.OFFER, reached: true });
  });
});

describe("NU1-c · sentence, number, caption and label by kind", () => {
  it("send the partial / full / revision", () => {
    for (const [taskType, status, word, sentence] of [
      ["partial_requested", QueryStatus.PARTIAL_REQUESTED, "Partial asked for", "Send your partial."],
      ["full_requested", QueryStatus.FULL_REQUESTED, "Full asked for", "Send your full."],
      ["revise_resubmit", QueryStatus.REVISE_RESUBMIT, "Revision asked for", "Send your revision."],
    ] as const) {
      const l = nextLead(item({ taskType, status }), ctx(query({ status }), row({ status, stageStartMs: new Date(2026, 10, 3).getTime() })));
      expect(l.sentence).toBe(sentence);
      expect(l.figure).toMatchObject({ value: "17", caption: "days waiting" });
      expect(l.label).toEqual({ lead: word, rest: " · 3 Nov" });
      expect(l.agent).toEqual({ initials: "JM", name: "Jonathan Marsh", agency: "The Marsh Agency" });
    }
  });
  it("an offer's send the full is the full's card", () => {
    expect(nextKind({ group: "req", taskType: "offer_send_full" })).toBe("full");
  });
  it("nudge due: days past the expected date, the send and the expected date", () => {
    const l = nextLead(item({ group: "nudge", taskType: "nudge_overdue", status: QueryStatus.QUERIED, action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }),
      ctx(query(), row({ stageStartMs: new Date(2026, 7, 12).getTime(), expectedMs: new Date(2026, 9, 12).getTime() }), agent({ name: "Tom Okafor" })));
    expect(l.sentence).toBe("Send a nudge.");
    expect(l.figure).toMatchObject({ value: "39", caption: "days past date" });
    expect(l.label).toEqual({ lead: "Queried", rest: " 12 Aug · reply expected by 12 Oct" });
    expect(l.track?.cur).toBe(0);
  });
  it("nudge due after a send: the label names the send, not the query", () => {
    const l = nextLead(item({ group: "nudge", status: QueryStatus.PARTIAL_SENT, action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }),
      ctx(query({ status: QueryStatus.PARTIAL_SENT }), row({ status: QueryStatus.PARTIAL_SENT, stageStartMs: new Date(2026, 6, 1).getTime(), expectedMs: ago(5) })));
    expect(l.label?.lead).toBe("Partial sent");
  });
  it("no first name saved: still no he or she, and the sentence names nobody", () => {
    const l = nextLead(item({ group: "nudge", action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }), ctx(query(), row(), agent({ name: "" })));
    expect(l.sentence).toBe("Send a nudge.");
    const o = nextLead(item({ taskType: "offer_received", status: QueryStatus.OFFER }), ctx(query({ status: QueryStatus.OFFER }), row({ status: QueryStatus.OFFER }), agent({ name: "  " })));
    expect(o.sentence).toBe("Answer the offer.");
    for (const s of [l.sentence, o.sentence]) expect(s).not.toMatch(/\b(he|she|his|her)\b/i);
  });
  it("gone quiet: time since the last event; the query and the nudge dated; a dotted track", () => {
    const l = nextLead(item({ group: "quiet", taskType: "nudge_overdue", action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }),
      ctx(query({ lastNudgeSentDate: new Date(2026, 8, 2).toISOString() }), row({ sentMs: new Date(2026, 5, 21).getTime(), lastMs: new Date(2026, 5, 1).getTime() })));
    expect(l.sentence).toBe("Close it or nudge?");
    expect(l.figure).toMatchObject({ value: "5", caption: "months quiet" });
    expect(l.label).toEqual({ lead: "Gone quiet", rest: " · queried 21 Jun · nudged 2 Sep" });
    expect(l.track?.quiet).toBe(true);
  });
  it("gone quiet without a nudge says nothing about one", () => {
    const l = nextLead(item({ group: "quiet", taskType: "no_response_close" }), ctx(query(), row({ sentMs: ago(100), lastMs: ago(40) })));
    expect(l.label?.rest).not.toMatch(/nudged/);
    expect(l.figure).toMatchObject({ value: "6", caption: "weeks quiet" });
  });
  it("answer the offer", () => {
    const l = nextLead(item({ taskType: "offer_received", status: QueryStatus.OFFER }),
      ctx(query({ status: QueryStatus.OFFER, offerDate: new Date(2026, 10, 18).toISOString() }), row({ status: QueryStatus.OFFER }), agent({ name: "Rosalind Achebe" })));
    expect(l.sentence).toBe("Answer the offer.");
    expect(l.figure).toMatchObject({ value: "2", caption: "days ago" });
    expect(l.label).toEqual({ lead: "Offer made", rest: " · 18 Nov" });
    expect(l.track?.cur).toBe(3);
  });
  it("an offer made today: today, no caption", () => {
    const l = nextLead(item({ taskType: "offer_received" }), ctx(query({ status: QueryStatus.OFFER, offerDate: new Date(NOW).toISOString() }), row({ status: QueryStatus.OFFER })));
    expect(l.figure).toEqual({ value: "today", caption: null, wait: "today" });
  });
  it("a request over 60 days old counts in months", () => {
    const l = nextLead(item({ taskType: "full_requested" }), ctx(query({ status: QueryStatus.FULL_REQUESTED }), row({ status: QueryStatus.FULL_REQUESTED, stageStartMs: ago(95) })));
    expect(l.figure).toMatchObject({ value: "3", caption: "months waiting" });
  });
  it("tell the other agents: the open queries' seals and count, and who made the offer", () => {
    const others = Array.from({ length: 14 }, (_, i) => row({ id: `o${i}`, initials: `A${i}`, status: QueryStatus.QUERIED }));
    const closed = row({ id: "gone", court: "closed" });
    const l = nextLead(item({ taskType: "offer_tell_all", status: QueryStatus.OFFER, action: { kind: "drawer", request: { mode: "offer", queryId: "q1" } } }),
      ctx(query({ status: QueryStatus.OFFER, offerDate: new Date(2026, 10, 18).toISOString() }), row({ status: QueryStatus.OFFER }), agent({ name: "Rosalind Achebe" }), [...others, closed]));
    expect(l.sentence).toBe("Tell the others.");
    expect(l.figure).toMatchObject({ value: "14", caption: "still reading" });
    expect(l.seals).toEqual({ initials: ["A0", "A1", "A2", "A3"], more: 10 });
    expect(l.track).toBe(null);
    expect(l.sub).toBe("Rosalind Achebe made an offer on 18 Nov.");
  });
  it("not about a query: the task's own title and note, no number, no track, a plain head", () => {
    const l = nextLead(item({ group: "house", pre: "Add a typical reply time for ", who: "Priya Nair", note: "It sets the date you can expect to hear back.",
      action: { kind: "agent", agentId: "a1", tab: "overview", focus: "reply", sequence: ["a1"] } as unknown as ListItem["action"] }),
      { queries: [], agents: [agent({ name: "Priya Nair", agency: "Nair Literary" })], qcRows: [], nowMs: NOW });
    expect(l.sentence).toBe("Add a typical reply time for Priya Nair.");
    expect(l.sub).toBe("It sets the date you can expect to hear back.");
    expect(l.figure).toBe(null);
    expect(l.track).toBe(null);
    expect(l.stage).toBe(null);
    expect(l.agent).toMatchObject({ name: "Priya Nair", agency: "Nair Literary" });
  });
  it("every caption is two words at most, and none says a verdict", () => {
    const caps = [dayFigure(5, "waiting"), dayFigure(5, "past date"), dayFigure(5, "ago"), dayFigure(90, "past date"), quietFigure(30), quietFigure(90)].map((f) => f.caption ?? "");
    for (const c of caps) {
      expect(c.replace(/^(days?|months?|weeks?) /, "").split(" ").length, c).toBeLessThanOrEqual(2);
      expect(c).not.toMatch(/overdue|late/i);
    }
  });
});

import { nextRow } from "./nextUp";

describe("NU1-d · the rows beneath", () => {
  it("the task in one line with the agent's whole name, and its wait; never \"ago\"", () => {
    const send = nextRow(item({ taskType: "partial_requested" }), ctx(query({ status: QueryStatus.PARTIAL_REQUESTED }), row({ status: QueryStatus.PARTIAL_REQUESTED, stageStartMs: ago(23) }), agent({ name: "Daniel O'Rourke" })));
    expect(send).toEqual({ initials: "DO", text: "Send your partial to Daniel O'Rourke", wait: "23 days" });
    const nudge = nextRow(item({ group: "nudge", action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }), ctx(query(), row({ expectedMs: ago(39) }), agent({ name: "Tom Okafor" })));
    expect(nudge).toMatchObject({ text: "Send Tom Okafor a nudge", wait: "39 days" });
    const offer = nextRow(item({ taskType: "offer_received" }), ctx(query({ status: QueryStatus.OFFER, offerDate: new Date(ago(2)).toISOString() }), row({ status: QueryStatus.OFFER })));
    expect(offer.wait).toBe("2 days");
    for (const r of [send, nudge, offer]) expect(`${r.text} ${r.wait}`).not.toMatch(/\bago\b/);
  });
  it("a task with no wait shows none", () => {
    const hk = nextRow(item({ group: "house", pre: "Add genres for ", who: "4 agents", initials: "GE", action: { kind: "agent", agentId: "a1", tab: "overview", focus: "genres", sequence: ["a1", "a2", "a3", "a4"] } as unknown as ListItem["action"] }),
      { queries: [], agents: [agent()], qcRows: [], nowMs: NOW });
    expect(hk).toEqual({ initials: "GE", text: "Add genres for 4 agents", wait: null });
  });
});

import { nextButtons, OFFER_STEP } from "./nextUp";

describe("NU1-e · the buttons open the task's own step", () => {
  const door = (mode: string, extra: object = {}) => ({ kind: "drawer", request: { mode, queryId: "q1", ...extra } }) as ListItem["action"];
  it("send partial, full or revision: Log it as sent, the task's sent door", () => {
    for (const k of ["partial", "full", "revision"] as const) {
      const a = door("sent");
      expect(nextButtons(item({ action: a }), k)).toEqual([{ label: "Log it as sent", action: a, filled: true }]);
    }
  });
  it("nudge due: Log the nudge, the task's nudge door", () => {
    const a = door("nudge", { preset: { nudgeTab: "sent" } });
    expect(nextButtons(item({ action: a }), "nudge")).toEqual([{ label: "Log the nudge", action: a, filled: true }]);
  });
  it("gone quiet: Close it filled, Log a nudge the outline", () => {
    const b = nextButtons(item({ action: door("close", { preset: { closeWhy: "noreply" } }) }), "quiet");
    expect(b.map((x) => [x.label, x.filled])).toEqual([["Close it", true], ["Log a nudge", false]]);
    expect(b[0].action).toEqual({ kind: "drawer", request: { mode: "close", queryId: "q1", preset: { closeWhy: "noreply" } } });
    expect(b[1].action).toEqual({ kind: "drawer", request: { mode: "nudge", queryId: "q1", preset: { nudgeTab: "sent" } } });
  });
  it("answer the offer: Record your answer, the offer journey at Your decision", () => {
    const b = nextButtons(item({ action: door("offer", { preset: { step: 1 } }) }), "offer");
    expect(b).toEqual([{ label: "Record your answer", action: { kind: "drawer", request: { mode: "offer", queryId: "q1", preset: { step: OFFER_STEP.decision } } }, filled: true }]);
  });
  it("tell the other agents: See who to tell, the task's own door (the offer journey at The others)", () => {
    const a = door("offer", { preset: { step: OFFER_STEP.others } });
    expect(nextButtons(item({ action: a }), "tell")).toEqual([{ label: "See who to tell", action: a, filled: true }]);
  });
  it("not about a query: the task's own action, else Open", () => {
    const a = { kind: "agent", agentId: "a1", tab: "overview", focus: "reply", sequence: ["a1"] } as unknown as ListItem["action"];
    expect(nextButtons(item({ action: a, actLabel: "Fill in" }), "other")).toEqual([{ label: "Fill in", action: a, filled: true }]);
    expect(nextButtons(item({ action: a, actLabel: "" }), "other")[0].label).toBe("Open");
  });
  it("one filled button on every card", () => {
    for (const k of ["partial", "full", "revision", "nudge", "quiet", "offer", "tell", "other"] as const) {
      expect(nextButtons(item({ action: door("sent") }), k).filter((b) => b.filled)).toHaveLength(1);
    }
  });
});

import { readFileSync } from "node:fs";
describe("NU1-f · the opener takes one optional step, and the journey is untouched", () => {
  const store = readFileSync(new URL("./queryPanelStore.ts", import.meta.url), "utf8");
  const dash = readFileSync(new URL("../components/dashboard/v58/Dash58.tsx", import.meta.url), "utf8");
  it("openQueryPanel(id, from, step?) steps the task's own request into the panel's slot", () => {
    expect(store).toMatch(/export function openQueryPanel\(id: string, from: PanelOrigin = "other", step\?: OpenRequest\): void/);
    expect(store).toMatch(/openQueryDrawer\(\{ \.\.\.req, queryId: id \}\)/);
  });
  it("the Dashboard's lead buttons go through it with the panel named; the rows keep viewTask", () => {
    expect(dash).toMatch(/onView=\{viewTask\} onStep=\{stepTask\}/);
    expect(dash).toMatch(/openQueryPanel\(qid, "dashboard", \{ \.\.\.a\.request, panel: \{/);
  });
});

describe("NU11-a · the sentence names no agent and is 18 characters at most (v1.1)", () => {
  const named = { name: "Rosalind Achebe-Featherstonehaugh" };
  const cases: [string, Partial<ListItem>, Query, QcRow, string][] = [
    ["partial", { taskType: "partial_requested", status: QueryStatus.PARTIAL_REQUESTED }, query({ status: QueryStatus.PARTIAL_REQUESTED }), row({ status: QueryStatus.PARTIAL_REQUESTED, stageStartMs: ago(3) }), "Send your partial."],
    ["full", { taskType: "full_requested", status: QueryStatus.FULL_REQUESTED }, query({ status: QueryStatus.FULL_REQUESTED }), row({ status: QueryStatus.FULL_REQUESTED, stageStartMs: ago(3) }), "Send your full."],
    ["revision", { taskType: "revise_resubmit", status: QueryStatus.REVISE_RESUBMIT }, query({ status: QueryStatus.REVISE_RESUBMIT }), row({ status: QueryStatus.REVISE_RESUBMIT, stageStartMs: ago(3) }), "Send your revision."],
    ["nudge", { group: "nudge", taskType: "nudge_overdue", action: { kind: "drawer", request: { mode: "nudge", queryId: "q1" } } }, query(), row({ expectedMs: ago(4) }), "Send a nudge."],
    ["quiet", { group: "quiet", taskType: "no_response_close" }, query(), row({ sentMs: ago(100), lastMs: ago(40) }), "Close it or nudge?"],
    ["offer", { taskType: "offer_received", status: QueryStatus.OFFER }, query({ status: QueryStatus.OFFER }), row({ status: QueryStatus.OFFER }), "Answer the offer."],
    ["tell", { taskType: "offer_tell_all", status: QueryStatus.OFFER, action: { kind: "drawer", request: { mode: "offer", queryId: "q1" } } }, query({ status: QueryStatus.OFFER }), row({ status: QueryStatus.OFFER }), "Tell the others."],
  ];
  for (const [kind, it_, q, r, want] of cases) it(`${kind}: "${want}"`, () => {
    const l = nextLead(item(it_), ctx(q, r, agent(named)));
    expect(l.kind).toBe(kind);
    expect(l.sentence).toBe(want);
    /* "Send your revision." is 19: Nick ruled the three send sentences unchanged, and that ruling wins over the 18. The
       rendered check (NU11-F in nextUp1.measure.ts) is what proves it fits without the ellipsis. */
    expect(l.sentence.length).toBeLessThanOrEqual(kind === "revision" ? LEAD_SENTENCE_MAX + 1 : LEAD_SENTENCE_MAX);
    expect(l.sentence).not.toMatch(/Rosalind|Achebe/);
  });
});

describe("NU11-b · a request with no recorded date says so (v1.1)", () => {
  for (const [taskType, status, word] of [
    ["partial_requested", QueryStatus.PARTIAL_REQUESTED, "Partial asked for"],
    ["full_requested", QueryStatus.FULL_REQUESTED, "Full asked for"],
    ["revise_resubmit", QueryStatus.REVISE_RESUBMIT, "Revision asked for"],
  ] as const) it(`${word} · date not recorded; no number, no caption, no wait`, () => {
    const it_ = item({ taskType, status });
    const c = ctx(query({ status }), row({ status, stageStartMs: null }));
    const l = nextLead(it_, c);
    expect(l.label).toEqual({ lead: word, rest: " · date not recorded" });
    expect(l.figure).toBe(null);
    expect(nextRow(it_, c).wait).toBe(null);
  });
  it("a dated request is unchanged", () => {
    const l = nextLead(item({ taskType: "full_requested" }), ctx(query({ status: QueryStatus.FULL_REQUESTED }), row({ status: QueryStatus.FULL_REQUESTED, stageStartMs: new Date(2026, 10, 1).getTime() })));
    expect(l.label).toEqual({ lead: "Full asked for", rest: " · 1 Nov" });
  });
});

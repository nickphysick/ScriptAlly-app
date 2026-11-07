/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — the workspace's model (lib/todoWs): kinds and titles, the housekeeping expansion, notes kept out,
 * the priority line, the day counts and the Mentor's words.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query, type UserTask } from "../types";
import type { TrayItem } from "./todoTray";
import { andList, dayBit, doingPhrase, dueChip, mentorLine, passes, priorityTask, replyWords, startReason, stripWords, whenOf, wsSections, wsTasks, NO_WS_FILTERS, STRIP_GROUP, type WsTask } from "./todoWs";

const NOW = Date.parse("2026-11-05T10:00:00");
const ymd = (d: number) => { const x = new Date(NOW + d * 86400000); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const agent = (id: string, name: string, agency: string): Agent => ({ id, name, agency } as Agent);
const q = (id: string, agentId: string, status: QueryStatus): Query => ({ id, agentId, status, manuscriptId: "m1" } as Query);

const GROUP = { you: { id: "you" }, chase: { id: "chase" }, quiet: { id: "quiet" }, tidy: { id: "tidy" }, mine: { id: "mine" } } as const;
function item(o: { key: string; bucket: string; group: keyof typeof GROUP; taskType?: string; query?: Query; agent?: Agent; userTask?: UserTask; due?: number | null; anchorDays?: number; sweep?: boolean; sweepRule?: string }): TrayItem {
  return {
    key: o.key, bucket: o.bucket, group: GROUP[o.group], card: { key: o.key, taskType: o.taskType, sweepRule: o.sweepRule } as never,
    query: o.query, agent: o.agent, userTask: o.userTask, deed: "Do the thing", sweep: !!o.sweep,
    dial: { kind: o.due == null ? "none" : o.due < 0 ? "late" : "run", frac: 0, day: null, mon: "", ymd: o.due == null ? null : ymd(o.due), title: "" },
    anchorMs: NOW - (o.anchorDays ?? 0) * 86400000,
  } as unknown as TrayItem;
}

const tom = agent("a1", "Tom Ellery", "Ellery & Finch");
const clara = agent("a2", "Clara Beaumont", "Harbour Lane");
const priya = agent("a3", "Priya Raman", "Raman & Rowe");
const daniel = agent("a4", "Daniel O’Rourke", "Inkwell & Stone");
const sophie = agent("a5", "Sophie Dunn", "Ashgrove Literary");
const isla = agent("a6", "Isla Fraser", "Fraser Ross");
const AGENTS = [tom, clara, priya, daniel, sophie, isla];

const ITEMS: TrayItem[] = [
  item({ key: "offer", bucket: "decide", group: "you", taskType: "offer_received", query: q("q1", "a1", QueryStatus.OFFER), agent: tom, due: 1 }),
  item({ key: "send", bucket: "send", group: "you", taskType: "partial_requested", query: q("q2", "a2", QueryStatus.PARTIAL_REQUESTED), agent: clara, due: -8 }),
  item({ key: "nudge", bucket: "chase", group: "chase", taskType: "nudge_overdue", query: q("q3", "a3", QueryStatus.QUERIED), agent: priya, due: -12 }),
  item({ key: "quiet", bucket: "close", group: "quiet", taskType: "no_response_close", query: q("q4", "a4", QueryStatus.QUERIED), agent: daniel, anchorDays: 110 }),
  item({ key: "sweep", bucket: "fix", group: "tidy", sweep: true, sweepRule: "dq_responseTime" }),
  item({ key: "own", bucket: "note", group: "mine", userTask: { id: "t1", text: "Tighten the synopsis", dueDate: ymd(2) } as UserTask, due: 2 }),
  item({ key: "note", bucket: "note", group: "mine", userTask: { id: "t2", text: "A note to self" } as UserTask }),
];
const tasks = wsTasks(ITEMS, AGENTS, (i) => (i.sweep ? "responseTime" : null), (i) => (i.sweep ? ["a5", "a6"] : []), NOW);
const byKey = (k: string) => tasks.find((t) => t.key === k)!;

describe("the workspace's tasks", () => {
  it("names each kind the way the mock does", () => {
    expect(byKey("offer").title).toBe("Answer Tom’s offer");
    expect(byKey("send").title).toBe("Send Clara your partial");
    expect(byKey("nudge").title).toBe("Nudge Priya");
    expect(byKey("quiet").title).toBe("Daniel’s gone quiet");
    expect(byKey("sweep|a5").title).toBe("How long does Sophie take to reply?");
    expect(byKey("own").title).toBe("Tighten the synopsis");
  });
  it("expands a housekeeping sweep into one row per agent", () => {
    expect(tasks.filter((t) => t.kind === "fix").map((t) => t.agent?.id)).toEqual(["a5", "a6"]);
  });
  it("never lets a note to self into the list", () => {
    expect(tasks.some((t) => t.key === "note")).toBe(false);
  });
  it("groups as the tray does, in the mock's order", () => {
    const s = wsSections(tasks, "category");
    expect(s.map((x) => x.name)).toEqual(["Agents are waiting", "Nudges", "Gone quiet", "Housekeeping", "Your tasks"]);
    expect(s[0].tasks.map((t) => t.key)).toEqual(["send", "offer"]);
  });
  it("filters by type and by when", () => {
    expect(tasks.filter((t) => passes(t, { ...NO_WS_FILTERS, types: new Set(["Decide"]) })).map((t) => t.key)).toEqual(["offer"]);
    expect(whenOf(byKey("send"))).toBe("Overdue");
    expect(whenOf(byKey("sweep|a5"))).toBe("No date");
  });
});

describe("the priority line", () => {
  it("puts an offer due within a day first", () => {
    expect(priorityTask(tasks)).toEqual({ task: byKey("offer"), urgent: true });
    expect(doingPhrase(byKey("offer"))).toBe("Answering Tom’s offer from Ellery & Finch");
  });
  it("otherwise the most overdue dated task, Gone quiet excluded", () => {
    const rest = tasks.filter((t) => t.kind !== "offer");
    expect(priorityTask(rest).task?.key).toBe("nudge");
    expect(doingPhrase(byKey("nudge"))).toBe("Nudging Priya at Raman & Rowe");
    expect(doingPhrase(byKey("send"))).toBe("Sending Clara at Harbour Lane your partial");
  });
  it("with nothing urgent, the soonest dated task, then Gone quiet, then housekeeping", () => {
    const calm = tasks.filter((t) => t.key !== "offer" && t.key !== "send" && t.key !== "nudge");
    expect(priorityTask(calm)).toEqual({ task: byKey("own"), urgent: false });
    expect(priorityTask(calm.filter((t) => t.kind !== "own")).task?.kind).toBe("quiet");
    expect(priorityTask(calm.filter((t) => t.kind === "fix")).task?.kind).toBe("fix");
  });
});

describe("the day counts and the chip", () => {
  it("late counts read late; Gone quiet reads days in; housekeeping has no date", () => {
    expect(dayBit(byKey("send"))).toEqual({ big: "8", small: "days late", late: true });
    expect(dayBit(byKey("quiet"))).toEqual({ big: "110", small: "days in", late: false });
    expect(dayBit(byKey("sweep|a5"))).toEqual({ big: null, small: "No date", late: false });
    expect(dueChip(byKey("offer"))).toEqual({ b: "1", s: "day left", late: false });
  });
});

describe("the words", () => {
  it("the Mentor speaks in the first person, and never guesses a pronoun for an agent", () => {
    const lines = tasks.map((t: WsTask) => mentorLine(t, { nudgedOn: null, nrmn: true, windowWeeks: 8 }));
    expect(lines.join(" ")).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
    expect(mentorLine(byKey("send"))).toMatch(/I’ll keep an eye out/);
    expect(mentorLine(byKey("quiet"), { nudgedOn: null, nrmn: true, windowWeeks: 8 })).toBe("Inkwell & Stone say no reply after 8 weeks means no, and it’s been 16 weeks. Closing it is reasonable, but it’s your call.");
  });
  it("the reply-time slider's readout", () => {
    expect(replyWords(null)).toEqual(["Not set yet", "Drag the slider"]);
    expect(replyWords(10)[0]).toBe("10 weeks");
    expect(replyWords(10)[1]).toBe("About average · about 2 and a half months");
    expect(replyWords(1)).toEqual(["1 week", "Very quick"]);
    expect(replyWords(20)[1]).toMatch(/^Slower than most/);
  });
  it("lists with and", () => {
    expect(andList(["query letter", "synopsis", "full manuscript"])).toBe("query letter, synopsis and full manuscript");
  });
});

/* To-do list v51 — THE AGENT'S REPLY TIME, SAID ONLY WHERE IT IS SET (Agent.responseTimeWeeks) */
describe("the reply time in the Mentor's words", () => {
  const set = { nudgedOn: null, nrmn: false, windowWeeks: 6 };
  const unset = { nudgedOn: null, nrmn: false, windowWeeks: null };
  it("a nudge names the agent's reply time when it is set, and says nothing about it when it isn't", () => {
    expect(mentorLine(byKey("nudge"), set)).toBe("Priya usually takes about 6 weeks to reply, and that’s gone by. A short, friendly nudge is completely normal. Let me know once you’ve sent it.");
    const plain = mentorLine(byKey("nudge"), unset);
    expect(plain).toBe("Priya hasn’t replied yet. A short, friendly nudge is completely normal. Let me know once you’ve sent it.");
    expect(plain).not.toMatch(/reply time|usually|weeks/);
    expect(mentorLine(byKey("nudge")), "no facts at all: nothing about it either").toBe(plain);
  });
  it("Gone quiet names it too, when set and nothing else outranks it", () => {
    expect(mentorLine(byKey("quiet"), set)).toBe("Daniel usually takes about 6 weeks to reply, and it’s been 16 weeks with no word. One polite nudge is normal before you give up on it.");
    expect(mentorLine(byKey("quiet"), unset)).toBe("It’s been 16 weeks with no word from Daniel. One polite nudge is normal before you give up on it.");
  });
});

/* To-do list v51.1 — THE HEADER'S PHRASE IS BUILT, NEVER COPIED; EVERY HOUSEKEEPING ROW NAMES ITS AGENT.
   Names with apostrophes, hyphens and accents, and every card carrying the raw text "o'r" as its own stored title and
   deed: if any path copies stored text into the header or a row, that text appears and the case fails. */
describe("v51.1 — the priority phrase and the row titles", () => {
  const zoe = agent("z1", "Zoë O’Rourke", "Smith-Jones Literary");
  const mk = agent("z2", "Mary-Kate Smith-Jones", "O’Rourke & Partners");
  const solo = agent("z3", "", "Agence Zoë");
  const RAW = "o'r";
  const row = (key: string, bucket: string, group: keyof typeof GROUP, taskType: string, a: Agent, status: QueryStatus | null, extra: Record<string, unknown> = {}): TrayItem => {
    const x = item({ key, bucket, group, taskType, agent: a, query: status ? q(`q-${key}`, a.id, status) : undefined, due: -3 });
    return { ...x, deed: RAW, card: { ...(x.card as object), title: RAW, manuscriptTitle: "Murphy’s Day Out", ...extra } } as unknown as TrayItem;
  };
  const ROWS: TrayItem[] = [
    row("send", "send", "you", "partial_requested", zoe, QueryStatus.PARTIAL_REQUESTED),
    row("full", "send", "you", "full_requested", mk, QueryStatus.FULL_REQUESTED),
    row("offer", "decide", "you", "offer_received", zoe, QueryStatus.OFFER),
    row("nudge", "chase", "chase", "nudge_overdue", mk, QueryStatus.QUERIED),
    row("quiet", "close", "quiet", "no_response_close", zoe, QueryStatus.QUERIED),
    row("mat", "fix", "tidy", "materials_unrecorded", zoe, QueryStatus.QUERIED, { relatedRecordId: "q-mat" }),
    row("tell", "fix", "tidy", "offer_tell", mk, QueryStatus.QUERIED),
    row("sendfull", "fix", "tidy", "offer_send_full", zoe, QueryStatus.QUERIED),
    row("wd", "fix", "tidy", "withdraw_tell", mk, QueryStatus.WITHDRAWN),
    row("signed", "fix", "tidy", "signed_tell", zoe, QueryStatus.WITHDRAWN),
    row("recheck", "fix", "tidy", "agent_recheck", solo, QueryStatus.QUERIED),
    row("dream", "fix", "tidy", "dream_agent_unqueried", mk, null),
    row("start", "fix", "tidy", "querying_unstarted", solo, null),
    row("bulk", "fix", "tidy", "materials_unrecorded_bulk", zoe, null),
  ];
  const tasks2 = wsTasks(ROWS, [zoe, mk, solo], () => null, () => [], NOW,
    (i) => (i.card.taskType === "materials_unrecorded_bulk" ? [{ queryId: "qb1", agentId: "z1" }, { queryId: "qb2", agentId: "z2" }] : []),
    [q("qb1", "z1", QueryStatus.QUERIED), q("qb2", "z2", QueryStatus.FULL_SENT)]);
  const by = (k: string) => tasks2.find((t) => t.key === k)!;

  it("each kind's phrase, from its kind, first name and agency", () => {
    expect(doingPhrase(by("send"))).toBe("Sending Zoë at Smith-Jones Literary your partial");
    expect(doingPhrase(by("full"))).toBe("Sending Mary-Kate at O’Rourke & Partners your full");
    expect(doingPhrase(by("offer"))).toBe("Answering Zoë’s offer from Smith-Jones Literary");
    expect(doingPhrase(by("nudge"))).toBe("Nudging Mary-Kate at O’Rourke & Partners");
    expect(doingPhrase(by("quiet"))).toBe("Deciding what to do about Zoë at Smith-Jones Literary");
    expect(doingPhrase(by("materials-batch"))).toBe("Filling in what you sent for 3 queries");
    expect(doingPhrase(by("tell"))).toBe("Telling Mary-Kate at O’Rourke & Partners about your offer");
    expect(doingPhrase(by("sendfull"))).toBe("Sending Zoë at Smith-Jones Literary your full");
    expect(doingPhrase(by("wd"))).toBe("Telling Mary-Kate at O’Rourke & Partners you’ve withdrawn");
    expect(doingPhrase(by("signed"))).toBe("Telling Zoë at Smith-Jones Literary you’ve signed");
    expect(doingPhrase(by("recheck"))).toBe("Checking on Agence Zoë");
    expect(doingPhrase(by("dream"))).toBe("Querying Mary-Kate at O’Rourke & Partners");
    expect(doingPhrase(by("start"))).toBe("Starting to query ‘Murphy’s Day Out’");
  });
  /* v52 Part B — Start here reuses the phrase above unchanged; its reason and the collapsed strip's lines are built too */
  it("v52 · Start here's reason", () => {
    expect(startReason({ task: { ...by("offer"), dueDays: 1 }, urgent: true })).toBe("Due tomorrow");
    expect(startReason({ task: { ...by("offer"), dueDays: 0 }, urgent: true })).toBe("Due today");
    expect(startReason({ task: { ...by("send"), dueDays: -8 }, urgent: true })).toBe("8 days late");
    expect(startReason({ task: { ...by("send"), dueDays: -1 }, urgent: true })).toBe("1 day late");
    expect(startReason({ task: by("quiet"), urgent: false })).toBe("Nothing urgent");
    expect(startReason({ task: null, urgent: false })).toBe("Nothing urgent");
  });
  it("v52 · the collapsed strip names each task by first name, kind and when, with apostrophes, hyphens and accents intact", () => {
    expect(stripWords({ ...by("send"), dueDays: -8 })).toEqual({ name: "Zoë", what: "Partial", when: "8d late", hot: true });
    expect(stripWords({ ...by("full"), dueDays: 7 })).toEqual({ name: "Mary-Kate", what: "Full", when: "7d", hot: false });
    expect(stripWords({ ...by("offer"), dueDays: 1 })).toEqual({ name: "Zoë", what: "Offer", when: "Tmrw", hot: true });
    expect(stripWords({ ...by("nudge"), dueDays: 0 })).toEqual({ name: "Mary-Kate", what: "Nudge", when: "Today", hot: true });
    expect(stripWords({ ...by("quiet"), quietDays: 110 })).toEqual({ name: "Zoë", what: "Quiet", when: "16 wks", hot: false });
    expect(stripWords(by("materials-batch")).when).toBe("");
    expect(STRIP_GROUP).toEqual({ wait: "Waiting", nudge: "Nudges", quiet: "Quiet", house: "Fill in", yours: "Yours" });
  });
  it("no phrase and no title carries a card's stored text", () => {
    for (const t of tasks2) {
      expect(doingPhrase(t), t.key).not.toContain(RAW);
      expect(t.title, t.key).not.toContain(RAW);
    }
  });
  it("every housekeeping row names its agent (the book, for the one task about a book)", () => {
    const house = tasks2.filter((t) => t.group === "house");
    expect(house.length).toBeGreaterThanOrEqual(8);
    for (const t of house) {
      if (t.item.card.taskType === "querying_unstarted") expect(t.title).toBe("Start querying ‘Murphy’s Day Out’");
      /* the batch row names its count; each query in it names its agent on the desk */
      else if (t.kind === "batch") expect(t.title).toMatch(/^Fill in what you sent · \d+ queries$/);
      else expect(t.title, t.key).toContain(t.first);
    }
    expect(by("tell").title).toBe("Tell Mary-Kate about your offer");
  });
  it("the materials gaps are ONE row (Nick, v51.1): its queue holds both queries, oldest first", () => {
    const rows = tasks2.filter((t) => t.item.card.taskType === "materials_unrecorded" || t.item.card.taskType === "materials_unrecorded_bulk");
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("batch");
    expect(rows[0].title).toBe("Fill in what you sent · 3 queries");
    expect(rows[0].batch?.map((m) => m.queryId)).toEqual(["q-mat", "qb1", "qb2"]);
  });
});

/* v51.1 (Nick) — "Fill in what you sent" is one row, counted as one */
describe("the materials batch", () => {
  const ag = Array.from({ length: 60 }, (_, n) => agent(`m${n}`, `Agent${n} Surname`, `Agency ${n}`));
  const qs = ag.map((a, n) => q(`mq${n}`, a.id, QueryStatus.QUERIED));
  const bulk = item({ key: "task-materials-bulk", bucket: "fix", group: "tidy", taskType: "materials_unrecorded_bulk" });
  const send = item({ key: "send", bucket: "send", group: "you", taskType: "partial_requested", query: q("qs", "a2", QueryStatus.PARTIAL_REQUESTED), agent: clara, due: -2 });
  const sixty = wsTasks([send, bulk], [...ag, clara], () => null, () => [], NOW, (i) => (i.card.taskType === "materials_unrecorded_bulk" ? qs.map((x) => ({ queryId: x.id, agentId: x.agentId })) : []), qs);

  it("60 gaps are ONE row, titled with the count, holding all 60 and the card that stands for them", () => {
    const rows = sixty.filter((t) => t.group === "house");
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Fill in what you sent · 60 queries");
    expect(rows[0].batch).toHaveLength(60);
    expect(rows[0].batchItems?.map((i) => i.key)).toEqual(["task-materials-bulk"]);
    expect(doingPhrase(rows[0])).toBe("Filling in what you sent for 60 queries");
  });
  it("the tab = the sum of the group headings = m (every count reads the same rows)", () => {
    const secs = wsSections(sixty, "category");
    expect(secs.reduce((n, x) => n + x.tasks.length, 0)).toBe(sixty.length);
    expect(sixty.length).toBe(2);
  });
  it("two single gaps are one batch row whose snooze reaches both cards", () => {
    const s1 = item({ key: "m1", bucket: "fix", group: "tidy", taskType: "materials_unrecorded", query: qs[0], agent: ag[0] });
    const s2 = item({ key: "m2", bucket: "fix", group: "tidy", taskType: "materials_unrecorded", query: qs[1], agent: ag[1] });
    (s1.card as { relatedRecordId?: string }).relatedRecordId = qs[0].id;
    (s2.card as { relatedRecordId?: string }).relatedRecordId = qs[1].id;
    const two = wsTasks([s1, s2], ag, () => null, () => [], NOW, () => [], qs);
    expect(two).toHaveLength(1);
    expect(two[0].title).toBe("Fill in what you sent · 2 queries");
    expect(two[0].batchItems?.map((i) => i.key)).toEqual(["m1", "m2"]);
  });
  it("one gap is that query's own row, naming its agent", () => {
    const s1 = item({ key: "m1", bucket: "fix", group: "tidy", taskType: "materials_unrecorded", query: qs[0], agent: ag[0] });
    (s1.card as { relatedRecordId?: string }).relatedRecordId = qs[0].id;
    const one = wsTasks([s1], ag, () => null, () => [], NOW, () => [], qs);
    expect(one.map((t) => [t.kind, t.title])).toEqual([["other", "Fill in what you sent Agent0"]]);
  });
});

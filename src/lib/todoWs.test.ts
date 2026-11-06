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
import { andList, dayBit, doingPhrase, dueChip, mentorLine, passes, priorityTask, replyWords, whenOf, wsSections, wsTasks, NO_WS_FILTERS, type WsTask } from "./todoWs";

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

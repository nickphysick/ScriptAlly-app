/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 — the tray model's pure locks: the three counts sum to the board, the five groups keep the table's
 * order, a dial enters each branch, a lede never appraises or genders an agent, and Coming up is in date order.
 */
import { describe, expect, it } from "vitest";
import {
  LEDE_FORBIDDEN, TRAY_GROUPS, comingUp, dialFor, groupOf, kindCounts, kindOf, lede, sortItems, trayItem, trayOrder, actionWords, trayDeed,
  type TrayDb,
} from "./todoTray";
import type { BoardCard } from "./todoBoard";
import { QueryStatus, type Agent, type Query, type UserTask } from "../types";

const NOW = Date.UTC(2026, 9, 15, 12, 0);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400e3).toISOString();
const card = (key: string, over: Partial<BoardCard>): BoardCard => ({
  key, stream: "do", title: key, who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "",
  committed: false, done: false, ...over,
});
const agents = [
  { id: "a1", name: "Greg Panetta", agency: "Curtis Vane", responseTimeWeeks: 8, noResponseMeansNo: true, materialsWanted: ["Query letter"], mswlNotes: "x" },
  { id: "a2", name: "Iris Callahan", agency: "Northgate", responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" },
] as unknown as Agent[];
const queries = [
  { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.PARTIAL_REQUESTED, dateSent: iso(110), partialRequestedDate: iso(80), materialsWanted: [] },
  { id: "q2", agentId: "a2", manuscriptId: "m1", status: QueryStatus.OFFER, dateSent: iso(120), offerDate: iso(5), offerResponseDeadline: iso(-8) },
  { id: "q3", agentId: "a1", manuscriptId: "m1", status: QueryStatus.FULL_SENT, dateSent: iso(200), fullSentDate: iso(90) },
  { id: "q4", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(150), lastNudgeSentDate: iso(40) },
  { id: "q5", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(3) },
] as unknown as Query[];
const userTasks = [
  { id: "t1", text: "Read chapter one aloud", dueDate: "2026-10-20", done: false, createdAt: iso(4) },
  { id: "t2", text: "A note", done: false, createdAt: iso(1), agentId: "a1" },
] as unknown as UserTask[];
const db: TrayDb = { queries, agents, manuscripts: [], userTasks, activities: [], packages: [], taskFlags: [] };
const cards: BoardCard[] = [
  card("send", { taskType: "partial_requested", relatedRecordId: "q1", agentId: "a1", status: QueryStatus.PARTIAL_REQUESTED }),
  card("offer", { taskType: "offer_received", relatedRecordId: "q2", agentId: "a2", status: QueryStatus.OFFER }),
  card("chase", { taskType: "nudge_overdue", relatedRecordId: "q3", agentId: "a1", status: QueryStatus.FULL_SENT }),
  card("close", { taskType: "no_response_close", relatedRecordId: "q4", agentId: "a1", status: QueryStatus.QUERIED }),
  card("fix", { taskType: "data_quality_poor", relatedRecordId: "a2", agentId: "a2", hk: true }),
  card("t1", { userTaskId: "t1", nature: "task", dueYmd: "2026-10-20", stream: "nt" }),
];
const items = cards.map((c) => trayItem(c, db, NOW));

describe("TD5 — groups and counts", () => {
  it("every card lands in one group and one count row, and the rows sum to the board", () => {
    const n = kindCounts(cards);
    expect(n.you + n.chase + n.tidy).toBe(cards.length);
    expect(n).toEqual({ you: 2, chase: 2, tidy: 2 });
    expect(cards.map((c) => groupOf(c).id)).toEqual(["you", "you", "chase", "quiet", "tidy", "mine"]);
    expect(cards.map((c) => kindOf(c))).toEqual(["you", "you", "chase", "chase", "tidy", "tidy"]);
  });
  it("the tray keeps the table's order, empty groups not drawn", () => {
    expect(trayOrder(items, "urgent").map((g) => g.group.id)).toEqual(TRAY_GROUPS.map((g) => g.id));
    expect(trayOrder(items.filter((i) => i.group.id !== "chase"), "urgent").map((g) => g.group.id)).toEqual(["you", "quiet", "tidy", "mine"]);
  });
  it("most urgent puts a passed date before a running one, and no date last", () => {
    const rank = sortItems(items, "urgent").map((i) => i.dial.kind);
    const firstNone = rank.indexOf("none");
    expect(rank.slice(firstNone).every((k) => k === "none")).toBe(true);
    const lastLate = rank.lastIndexOf("late");
    const firstRun = rank.indexOf("run");
    if (lastLate >= 0 && firstRun >= 0) expect(lastLate).toBeLessThan(firstRun);
  });
});

describe("TD5 — the dial", () => {
  it("enters each branch", () => {
    expect(dialFor(null, NaN, NOW).kind).toBe("none");
    expect(dialFor("2026-10-01", NOW - 30 * 86400e3, NOW).kind).toBe("late");
    const run = dialFor("2026-10-25", NOW - 10 * 86400e3, NOW);
    expect(run.kind).toBe("run");
    expect(run.frac).toBeGreaterThan(0.4);
    expect(run.frac).toBeLessThan(0.6);
  });
});

describe("TD5 C3 (unit) — a lede states facts and nothing else", () => {
  it("no appraisal, no urgency word and no gendered pronoun, for every bucket", () => {
    const ledes = items.map((i) => lede(i, db, NOW));
    expect(ledes.filter(Boolean).length).toBeGreaterThanOrEqual(5);
    for (const l of ledes) expect(l, l).not.toMatch(LEDE_FORBIDDEN);
  });
  it("names the agent by first name or agency and states what the record holds", () => {
    const [send, offer, chase, close, fix] = items.map((i) => lede(i, db, NOW));
    expect(send).toMatch(/^Greg asked for /);
    expect(offer).toMatch(/^Iris offered representation on .+ and asked for an answer by /);
    expect(offer).toMatch(/One other agent holds your full\.$/);
    expect(chase).toMatch(/weeks since your full went to Greg\. Curtis Vane’s stated window is 8 weeks\.$/);
    expect(close).toMatch(/nothing since your nudge on .+ Curtis Vane says no reply means no\.$/);
    expect(fix).toMatch(/^Iris Callahan’s profile has no usual reply time, what to send or manuscript wishlist on record\.$/);
  });
  it("the forbidden set catches what it must", () => {
    for (const w of ["overdue", "late", "her", "his", "she", "he", "fair", "honest", "oldest"]) expect(`a ${w} b`).toMatch(LEDE_FORBIDDEN);
  });
});

describe("TD5 E1 (unit) — the action words", () => {
  it("say what the door does, per bucket", () => {
    expect(items.map(actionWords)).toEqual(["Mark the partial sent", "Open the offer", "Record a nudge", "Decide what to do", "Add it to their profile", "Tick it off"]);
    expect(trayDeed(card("rr", { taskType: "revise_resubmit" }))).toBe("Send the revision");
  });
});

describe("TD5 G1 (unit) — Coming up", () => {
  it("is at most three future dates, in order", () => {
    const up = comingUp(db, NOW, 3);
    expect(up.length).toBeLessThanOrEqual(3);
    expect(up.length).toBeGreaterThan(0);
    for (let k = 1; k < up.length; k++) expect(up[k].ms).toBeGreaterThanOrEqual(up[k - 1].ms);
    for (const u of up) expect(u.ymd > "2026-10-15").toBe(true);
  });
});

describe("TD5 E1 (unit) — a profile gap reaches the tray as a sweep, read by its rule", () => {
  const sweep = (n: number) => ({ ...card("sweep-dq_responseTime", { taskType: "data_quality_poor", hk: true, stream: "hk" }), sweepOf: n, sweepRule: "dq_responseTime" }) as unknown as BoardCard;
  const member = (id: string, name: string) => ({ card: card(id, {}), agentName: name, agentId: id, agency: "X", queried: true });
  it("one agent: that agent, the agent card's words", () => {
    const g = [{ rule: "dq_responseTime", meta: {}, members: [member("a2", "Iris Callahan")] }];
    const i = trayItem(sweep(1), { ...db, hkGroups: g as never }, NOW);
    expect(i.deed).toBe("Add their reply time");
    expect(i.agent?.id).toBe("a2");
    expect(actionWords(i)).toBe("Add it to their profile");
    expect(lede(i, { ...db, hkGroups: g as never }, NOW)).toBe("Iris Callahan’s profile has no usual reply time on record. You have queried this agent.");
  });
  it("several agents: no single agent, the sweep's words", () => {
    const g = [{ rule: "dq_responseTime", meta: {}, members: [member("a1", "Greg Panetta"), member("a2", "Iris Callahan")] }];
    const i = trayItem(sweep(2), { ...db, hkGroups: g as never }, NOW);
    expect(i.agent).toBeUndefined();
    expect(i.who).toBe("2 agents");
    expect(actionWords(i)).toBe("Fill them in");
  });
});

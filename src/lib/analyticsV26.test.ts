/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsV26 — the one short page's figures, run through the real `analyticsModel`. The main fixture is the mock's
 * sample (design-refs/analytics-v26): 27 sent in three runs of 9; 13 waiting (1–42 weeks out), 4 being read, 1 offer,
 * 9 ended (2 read then passed, 3 passed, 4 closed by the writer); 10 replies at 2–13 weeks; three genres (12, 8, 7);
 * 11 with a personal note; 5 nudges, 3 replied after 4, 6 and 9 days; 4 first nudges due.
 */
import { describe, it, expect } from "vitest";
import { Activity, ActivityType, Agent, Query, QueryStatus, Task } from "../types";
import { analyticsModel } from "./analyticsModel";
import { BENCHMARKS_QUERYTRACKER } from "./analyticsV24";
import {
  buildV26, findings, mostOneIn, nowGroups, nudgeResults, oneIn, pathSteps, replyTimes, rounds, stateOf, whoSaysYes, wk, weeksOf, lineOf, fateOf,
} from "./analyticsV26";

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime();
const DAY = 86400000;
const ago = (n: number) => new Date(NOW - n * DAY).toISOString();
let seq = 0;
const nid = () => `v${String(++seq).padStart(3, "0")}`;
const R = QueryStatus;
const CRIME = "Crime and thriller", LIT = "Literary fiction", COMM = "Commercial fiction";
const agent = (genres: string[], over: Partial<Agent> = {}): Agent =>
  ({ id: nid(), userId: "u", name: `Agent ${seq}`, agency: `Agency ${seq}`, email: "", website: "", responseTimeWeeks: 6, genres, ...over }) as Agent;
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: nid(), userId: "u", queryId, manuscriptId: "ms", activityType: ActivityType.STATUS_CHANGED, description: "", date, details: "", resultingStatus: status }) as unknown as Activity;
const nudgeAct = (queryId: string, date: string, keyed = true): Activity =>
  ({ id: nid(), userId: "u", queryId, manuscriptId: "ms", activityType: ActivityType.NUDGE_SENT, description: "Nudge sent", date, details: "", ...(keyed ? { eventKey: "nudge_sent" } : {}) }) as unknown as Activity;
type Part = { q: Query; acts: Activity[]; a: Agent };
/** a query sent `sent` days ago, its rungs `d` days AFTER the send; a genre and a personal note */
function walk(sent: number, genre: string, note: boolean, steps: [QueryStatus, number][] = []): Part {
  const a = agent([genre]);
  const last = steps.length ? steps[steps.length - 1][0] : R.QUERIED;
  const q = { id: nid(), userId: "u", manuscriptId: "ms", agentId: a.id, packageId: "", status: last, personalisationNotes: note ? "Loved your talk at the festival" : "  ", sendMethod: "Email", dateSent: ago(sent) } as unknown as Query;
  return { a, q, acts: [rung(q.id, R.QUERIED, ago(sent)), ...steps.map(([s, d]) => rung(q.id, s, ago(sent - d)))] };
}
const W = 7;
/* ── the mock's sample, in send order (oldest first) ── */
const round1: Part[] = [
  walk(330, CRIME, false, [[R.NO_RESPONSE, 30 * W]]),
  walk(320, LIT, false, [[R.NO_RESPONSE, 22 * W]]),
  walk(310, COMM, false, [[R.NO_RESPONSE, 18 * W]]),
  walk(300, LIT, false, [[R.NO_RESPONSE, 15 * W]]),
  walk(294, CRIME, true),                                              // waiting 42 wks
  walk(290, CRIME, true, [[R.PARTIAL_REQUESTED, 11 * W], [R.PARTIAL_SENT, 11 * W + 2], [R.REJECTED, 11 * W + 30]]), // read, then passed
  walk(280, LIT, false, [[R.REJECTED, 9 * W]]),                          // passed 9 wks
  walk(270, COMM, false, [[R.REJECTED, 13 * W]]),                        // passed 13 wks (the slowest)
  walk(217, CRIME, false),                                             // waiting 31 wks
];
const round2: Part[] = [
  walk(210, LIT, true, [[R.REJECTED, 7 * W]]),                           // passed 7 wks
  walk(200, CRIME, true, [[R.PARTIAL_REQUESTED, 6 * W], [R.PARTIAL_SENT, 6 * W + 3]]),
  walk(190, CRIME, true, [[R.FULL_REQUESTED, 8 * W], [R.FULL_SENT, 8 * W + 4]]),
  walk(180, CRIME, true, [[R.FULL_REQUESTED, 3 * W], [R.FULL_SENT, 3 * W + 5], [R.OFFER, 3 * W + 40]]), // the offer
  walk(175, COMM, false, [[R.PARTIAL_REQUESTED, 7 * W], [R.REJECTED, 7 * W + 20]]), // read, then passed
  walk(168, LIT, false), walk(133, CRIME, false), walk(112, LIT, true), walk(98, COMM, false), // waiting 24, 19, 16, 14
];
const round3: Part[] = [
  walk(70, CRIME, false),
  walk(63, LIT, true, [[R.PARTIAL_REQUESTED, 2 * W]]),                   // 2 wks
  walk(56, COMM, false),
  walk(49, CRIME, false, [[R.PARTIAL_REQUESTED, 5 * W], [R.PARTIAL_SENT, 5 * W + 1]]), // 5 wks
  walk(42, CRIME, true), walk(28, LIT, true), walk(21, COMM, false), walk(14, CRIME, false), walk(7, COMM, true),
];
const sample = [...round1, ...round2, ...round3];
/* five nudges: three answered 9, 6 and 4 days later, two not */
const N13 = round1[7], N9 = round1[6], N8 = round2[2];
const nudges = [
  nudgeAct(N13.q.id, ago(270 - 13 * W + 9)),
  nudgeAct(N9.q.id, ago(280 - 9 * W + 6), false),   // an old, unkeyed log row: still a nudge
  nudgeAct(N8.q.id, ago(190 - 8 * W + 4)),
  nudgeAct(round1[4].q.id, ago(100)),
  nudgeAct(round2[6].q.id, ago(60)),
];
/* the unqueried: seven who list crime first, one who lists it second; two who take other things */
const extra = [...Array.from({ length: 7 }, () => agent([CRIME])), agent([LIT, CRIME]), agent([LIT]), agent([COMM])];
const agents = [...sample.map((p) => p.a), ...extra];
const task = (id: string, reason: Task["reason"]): Task => ({ id: `t-${id}-${reason}`, taskType: "nudge_overdue", reason, relatedRecordId: id, title: "", priority: "overdue" } as unknown as Task);
const tasks = [
  ...[round2[5], round2[7], round2[8], round3[0]].map((p) => task(p.q.id, "nudge-first")),
  task(round1[4].q.id, "nudge-again"),           // already nudged: not a first nudge
  task(round1[0].q.id, "nudge-first"),           // closed: not open
];
const model = (parts: Part[], extraActs: Activity[] = []) => analyticsModel({
  queries: parts.map((p) => p.q), activities: [...parts.flatMap((p) => p.acts), ...extraActs], agents, range: "all", nowMs: NOW,
});
const m = model(sample, nudges);
const items = m.items;
const activities = [...sample.flatMap((p) => p.acts), ...nudges];

describe("words", () => {
  it("weeks are rounded, at least 1, and singular at 1", () => {
    expect(weeksOf(0)).toBe(1);
    expect(weeksOf(3)).toBe(1);
    expect(weeksOf(11)).toBe(2);
    expect(wk(1)).toBe("1 week");
    expect(wk(7)).toBe("7 weeks");
  });
  it("'About 1 in N' never says 1 in 1", () => {
    expect(oneIn(10, 27)).toBe("about 1 in 3");
    expect(oneIn(7, 27)).toBe("about 1 in 4");
    expect(oneIn(5, 5)).toBe("all of them");
    expect(oneIn(4, 5)).toBe("all of them");
    expect(oneIn(2, 5)).toBe("about 1 in 3");
  });
  it("the comparison's M is round(100 ÷ the request-rate anchor)", () => {
    expect(mostOneIn(BENCHMARKS_QUERYTRACKER.requestRate)).toBe(17);
  });
});

describe("nowGroups — four groups that sum to sent", () => {
  const g = nowGroups(items, NOW);
  it("13 waiting · 4 being read · 1 offer · 9 ended", () => {
    expect(g.counts).toEqual({ waiting: 13, reading: 4, offer: 1, ended: 9 });
    expect(g.groups.map((x) => x.key)).toEqual(["waiting", "reading", "offer", "ended"]);
    expect(g.groups.reduce((s, x) => s + x.marks.length, 0)).toBe(27);
  });
  it("the ended line: 5 passed (2 after reading), 4 closed by the writer", () => {
    expect([g.passed, g.closedByYou, g.withdrew]).toEqual([5, 4, 0]);
  });
  it("an empty group is omitted", () => {
    const only = nowGroups(model(round3).items, NOW);
    expect(only.groups.map((x) => x.key)).toEqual(["waiting", "reading"]);
  });
  it("each mark's line is counted from two logged dates", () => {
    const byId = new Map(g.groups.flatMap((x) => x.marks).map((mk) => [mk.id, mk.line]));
    expect(byId.get(round1[4].q.id)).toBe("Waiting 42 weeks");
    expect(byId.get(round2[1].q.id)).toBe("Asked for a partial after 6 weeks");
    expect(byId.get(round2[2].q.id)).toBe("Asked for the whole book after 8 weeks");
    expect(byId.get(round1[6].q.id)).toBe("Passed after 9 weeks");
    expect(byId.get(round1[0].q.id)).toBe("You closed it after 30 weeks");
    expect(byId.get(round1[5].q.id)).toBe("Read more, then passed");
    expect(byId.get(round2[3].q.id)).toBe("Made an offer. First replied after 3 weeks");
  });
  it("a withdrawn query is ended, and its line says so", () => {
    const p = walk(100, LIT, false, [[R.WITHDRAWN, 4 * W]]);
    const mm = model([p]);
    const e = mm.items[0];
    expect(fateOf(e)).toBe("withdrew");
    expect(lineOf(e, "withdrew", NOW)).toBe("You withdrew it after 4 weeks");
    expect(nowGroups(mm.items, NOW).withdrew).toBe(1);
  });
});

describe("pathSteps — every bar against the sent", () => {
  it("27 · 10 · 7 · 2 · 1, with the mock's notes", () => {
    const p = pathSteps(items);
    expect(p.map((s) => s.count)).toEqual([27, 10, 7, 2, 1]);
    expect(p.map((s) => s.note)).toEqual([null, "About 1 in 3 so far", "About 1 in 4", "2 of the 7 who asked for more", null]);
  });
  it("a step at zero has no note", () => {
    const p = pathSteps(model(round3.filter((x) => x.acts.length === 1)).items);
    expect(p.map((s) => s.count)).toEqual([7, 0, 0, 0, 0]);
    expect(p.every((s) => s.key === "sent" || s.note === null)).toBe(true);
  });
});

describe("replyTimes — dated replies only, in weeks", () => {
  const t = replyTimes(items, NOW);
  it("typical 7, quickest 2, slowest 13; asked 6, passed 9; band 5 to 9", () => {
    expect(t.replies.map((r) => r.weeks).sort((a, b) => a - b)).toEqual([2, 3, 5, 6, 7, 7, 8, 9, 11, 13]);
    expect([t.typical, t.quickest, t.slowest]).toEqual([7, 2, 13]);
    expect([t.typicalAsked, t.typicalPassed]).toEqual([6, 9]);
    expect([t.bandFrom, t.bandTo]).toEqual([5, 9]);
  });
  it("13 waiting at their weeks out; 6 beyond the slowest", () => {
    expect(t.waiting.map((w) => w.weeks)).toEqual([1, 2, 3, 4, 6, 8, 10, 14, 16, 19, 24, 31, 42]);
    expect(t.beyond.map((w) => w.weeks)).toEqual([14, 16, 19, 24, 31, 42]);
  });
  it("no band under 4 replies; nothing beyond with no reply", () => {
    const few = replyTimes(model(round3).items, NOW);
    expect(few.replies.length).toBe(2);
    expect([few.bandFrom, few.bandTo]).toEqual([null, null]);
    const none = replyTimes(model(round3.filter((x) => x.acts.length === 1)).items, NOW);
    expect([none.typical, none.slowest]).toEqual([null, null]);
    expect(none.beyond).toEqual([]);
  });
});

describe("rounds — send order, three runs", () => {
  it("9 / 9 / 9; asked 1, 4, 2; waiting 2, 4, 7", () => {
    const r = rounds(items, NOW)!;
    expect(r.map((x) => x.ids.length)).toEqual([9, 9, 9]);
    expect(r.map((x) => x.asked)).toEqual([1, 4, 2]);
    expect(r.map((x) => x.waiting)).toEqual([2, 4, 7]);
    expect(r[0].ids).toEqual(round1.map((p) => p.q.id));
  });
  it("the cut rule: ceil(n ÷ 3) in the first two, the rest in the third", () => {
    const ten = rounds(model(sample.slice(0, 10)).items, NOW)!;
    expect(ten.map((x) => x.ids.length)).toEqual([4, 4, 2]);
    const eleven = rounds(model(sample.slice(0, 11)).items, NOW)!;
    expect(eleven.map((x) => x.ids.length)).toEqual([4, 4, 3]);
  });
  it("null under 9 dated queries", () => {
    expect(rounds(model(sample.slice(0, 8)).items, NOW)).toBeNull();
    expect(rounds(model(sample.slice(0, 9)).items, NOW)).not.toBeNull();
  });
});

describe("whoSaysYes — the agent's first genre, groups of 3 or more", () => {
  const w = whoSaysYes(items, agents);
  it("5 of 12, 1 of 8, 1 of 7; 5 of 11 with a note, 2 of 16 without", () => {
    expect(w.byGenre).toEqual([{ label: CRIME, asked: 5, sent: 12 }, { label: LIT, asked: 1, sent: 8 }, { label: COMM, asked: 1, sent: 7 }]);
    expect(w.byNote.withNote).toEqual({ label: "With a personal note", asked: 5, sent: 11 });
    expect(w.byNote.without).toEqual({ label: "Without one", asked: 2, sent: 16 });
  });
  it("lead is crime and thriller; 8 agents who take it are unqueried", () => {
    expect(w.lead).toBe(CRIME);
    expect(w.unqueried).toBe(8);
  });
  it("a genre with fewer than 3 queries is dropped, and only the first genre counts", () => {
    const two = [walk(30, "Horror", false), walk(31, "Horror", false)];
    const second = walk(32, LIT, false); second.a.genres = [LIT, "Horror"];
    const ww = whoSaysYes(model([...two, second]).items, [...two, second].map((p) => p.a));
    expect(ww.byGenre).toEqual([]);
    expect(ww.lead).toBeNull();
    expect(ww.unqueried).toBe(0);
  });
  it("lead needs an ask; a note row with no queries is omitted", () => {
    const flat = Array.from({ length: 3 }, () => walk(40, LIT, false));
    const ww = whoSaysYes(model(flat).items, flat.map((p) => p.a));
    expect(ww.byGenre).toEqual([{ label: LIT, asked: 0, sent: 3 }]);
    expect(ww.lead).toBeNull();
    expect(ww.byNote.withNote).toBeNull();
  });
});

describe("nudgeResults — a reply belongs to the last nudge before it", () => {
  const n = nudgeResults(items, activities, tasks);
  it("5 sent, 3 replied after 4, 6 and 9 days, newest first", () => {
    expect(n.rows.length).toBe(5);
    expect(n.replied).toBe(3);
    expect(n.rows.map((r) => r.repliedDays).filter((d) => d !== null).sort((a, b) => a! - b!)).toEqual([4, 6, 9]);
    const at = n.rows.map((r) => r.atMs);
    expect([...at].sort((a, b) => b - a)).toEqual(at);
  });
  it("4 first nudges due on open queries (an again and a closed one are not)", () => {
    expect(n.due).toBe(4);
  });
  it("a reply before the nudge never counts; two nudges split the replies", () => {
    const p = walk(100, LIT, false, [[R.PARTIAL_REQUESTED, 30]]);
    const before = nudgeAct(p.q.id, ago(100 - 40));
    const n1 = nudgeResults(model([p], [before]).items, [...p.acts, before], []);
    expect(n1.rows.map((r) => r.repliedDays)).toEqual([null]);
    const q = walk(100, LIT, false, [[R.PARTIAL_REQUESTED, 50]]);
    const a1 = nudgeAct(q.q.id, ago(100 - 20)), a2 = nudgeAct(q.q.id, ago(100 - 45));
    const n2 = nudgeResults(model([q], [a1, a2]).items, [...q.acts, a1, a2], []);
    expect(n2.rows.map((r) => r.repliedDays)).toEqual([5, null]);
  });
  it("lastNudgeSentDate stands in only where the log has no nudge", () => {
    const p = walk(60, LIT, false);
    (p.q as Query).lastNudgeSentDate = ago(10);
    expect(nudgeResults(model([p]).items, p.acts, []).rows.length).toBe(1);
    const own = nudgeAct(p.q.id, ago(20));
    expect(nudgeResults(model([p], [own]).items, [...p.acts, own], []).rows.map((r) => r.atMs)).toEqual([NOW - 20 * DAY]);
  });
});

describe("findings — up to three, in order", () => {
  it("beyond · typical · bestRound (the second run, 4 of 9)", () => {
    const f = findings(replyTimes(items, NOW), rounds(items, NOW), 12);
    expect(f.map((x) => x.key)).toEqual(["beyond", "typical", "bestRound"]);
    const best = f[2];
    expect(best.key === "bestRound" && best.best.index).toBe(1);
    expect(best.key === "bestRound" && best.best.asked).toBe(4);
  });
  it("beyond goes when nothing is out longer; bestRound goes without rounds or asks", () => {
    const f = findings(replyTimes(model([round1[7], round3[8]]).items, NOW), null, 12);
    expect(f.map((x) => x.key)).toEqual(["typical"]);
  });
  it("a tie between runs goes to the later run", () => {
    const t = replyTimes(items, NOW);
    const r = rounds(items, NOW)!.map((x) => ({ ...x, asked: 2 }));
    const f = findings(t, r, 12).find((x) => x.key === "bestRound");
    expect(f && f.key === "bestRound" && f.best.index).toBe(2);
  });
});

describe("buildV26 — the three states", () => {
  it("day one, early, everyday", () => {
    expect(stateOf(0, 0)).toBe("dayOne");
    expect(stateOf(5, 4)).toBe("early");
    expect(stateOf(27, 5)).toBe("everyday");
    const v = buildV26({ items, activities, agents, tasks, nowMs: NOW, quietWeeks: 12 });
    expect(v.state).toBe("everyday");
    expect(v.tally.all).toBe(10);
    expect(v.oldestWaiting).toBe(42);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3, Phase B — one source for every phone figure. Every row is the REAL `buildQcRows`, never a hand-made row.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import { buildQcRows } from "./qcSummary";
import { quickOf, queryState } from "./queryState";
import { COURT_LABEL, courtRows, todayGroups, v3Counts, v3Queries, V3_COURTS } from "./phoneV3";
import type { WsTask } from "./todoWs";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 11, 12).getTime();
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const agent = (id: string, name: string, weeks = 8): Agent => ({ id, name, agency: `${name} Agency`, responseTimeWeeks: weeks, email: `${id}@example.com` } as unknown as Agent);
const q = (id: string, agentId: string, status: QueryStatus, sentDaysAgo: number, extra: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "ms1", status, dateSent: iso(sentDaysAgo), lastStatusChange: iso(Math.min(sentDaysAgo, 3)), ...extra } as unknown as Query);

const AGENTS = [agent("a1", "Clara Beaumont"), agent("a2", "Marcus Reed"), agent("a3", "Sophie Dunn"), agent("a4", "Rufus Hale", 4), agent("a5", "Tom Ellery"), agent("a6", "Ida Fraser"), agent("a7", "Noah Bright")];
const QUERIES: Query[] = [
  q("q1", "a1", QueryStatus.PARTIAL_REQUESTED, 30, { partialRequestedDate: iso(6) }),
  q("q2", "a2", QueryStatus.FULL_REQUESTED, 30, { fullRequestedDate: iso(5) }),
  q("q3", "a3", QueryStatus.QUERIED, 20),
  q("q4", "a4", QueryStatus.QUERIED, 50),                 // 22 days past a 4-week reply time: a nudge
  q("q5", "a5", QueryStatus.OFFER, 10),
  q("q6", "a6", QueryStatus.QUERIED, 400),                // gone quiet
  q("q7", "a7", QueryStatus.REJECTED, 90),                // closed
];
const ROWS = buildQcRows(QUERIES, AGENTS, [], NOW);
const task = (o: Partial<WsTask>): WsTask => ({ key: o.key ?? "k", kind: "send", group: "wait", title: "T", first: "A", agentName: "A", agency: "", dueDays: null, quietDays: null, type: "Send", hay: "", item: {} as never, ...o } as WsTask);
const TASKS: WsTask[] = [
  task({ key: "t5", kind: "offer", group: "wait", title: "Answer Tom’s offer", type: "Decide", query: QUERIES[4] }),
  task({ key: "t1", kind: "send", group: "wait", title: "Send Clara your partial", type: "Send", query: QUERIES[0] }),
  task({ key: "t4", kind: "nudge", group: "nudge", title: "Nudge Rufus", type: "Nudge", query: QUERIES[3] }),
  task({ key: "h1", kind: "fix", group: "house", title: "Fill in Ida’s details", type: "Fill in" }),
  task({ key: "y1", kind: "own", group: "yours", title: "Book the festival one-to-ones", type: null }),
];
const QS = v3Queries({ rows: ROWS, agents: AGENTS, tasks: TASKS, quietWeeks: 4, nowMs: NOW });

describe("whose court: the Query Centre's own state, honouring the Gone-quiet setting", () => {
  it("every court is quickOf(queryState) — the rule is read, never restated", () => {
    expect(QS.length).toBe(QUERIES.length);
    for (const v of QS) expect(v.court).toBe(quickOf(v.state));
    expect(QS.find((v) => v.id === "q5")!.court).toBe("you");
    expect(QS.find((v) => v.id === "q3")!.court).toBe("agent");
    expect(QS.find((v) => v.id === "q6")!.court).toBe("quiet");
    expect(QS.find((v) => v.id === "q7")!.court).toBe("closed");
  });
  it("the setting moves a query between courts (a 2-week window calls a nudged-and-waited query quiet sooner)", () => {
    const long = queryState({ ...ROWS.find((r) => r.id === "q4")!, nrmn: false }, { quietWeeks: 8, nowMs: NOW });
    const short = queryState({ ...ROWS.find((r) => r.id === "q4")!, nrmn: false }, { quietWeeks: 2, nowMs: NOW });
    expect([long, short]).toEqual(["nudge", "quiet"]);
  });
  it("the counts sum to All, and each court's rows are exactly its count", () => {
    const c = v3Counts(QS);
    expect(c.you + c.agent + c.quiet + c.closed).toBe(c.all);
    expect(c.active).toBe(c.all - c.closed);
    for (const k of V3_COURTS) expect(courtRows(QS, k).length).toBe(c[k]);
  });
});

describe("the task is the To-do workspace's own", () => {
  it("a query carries its workspace task, verb and title; a query with none carries none", () => {
    const q1 = QS.find((v) => v.id === "q1")!;
    expect([q1.verb, q1.taskTitle]).toEqual(["Send", "Send Clara your partial"]);
    expect(QS.find((v) => v.id === "q3")!.task).toBeNull();
  });
});

describe("the words: said once, plain, no verdicts", () => {
  it("no row's text says its status or its group twice (PA3-5)", () => {
    for (const v of QS) {
      const text = `${v.status} · ${v.short}`.toLowerCase();
      for (const w of [v.status.toLowerCase(), COURT_LABEL[v.court].toLowerCase()]) {
        expect(text.split(w).length - 1, `${v.id}: ${text}`).toBeLessThanOrEqual(1);
      }
      expect(v.short.toLowerCase()).not.toContain(COURT_LABEL[v.court].toLowerCase());
    }
  });
  it("never 'overdue' or 'late', never he or she (PA3-10)", () => {
    for (const v of QS) {
      const all = [v.short, v.step?.title ?? "", v.step?.sub ?? ""].join(" ");
      expect(all).not.toMatch(/overdue|\blate\b|\bhe\b|\bshe\b|\bhis\b|\bher\b/i);
    }
  });
  it("a closed query has no next step; every open one has one", () => {
    for (const v of QS) expect(v.step == null).toBe(v.court === "closed");
  });
});

describe("Today's groups: the workspace's own, under the ref's headings", () => {
  const g = todayGroups(TASKS);
  it("offers first, then the waiting and the nudges, then the desktop's own order (housekeeping folded)", () => {
    expect(g.map((x) => x.name)).toEqual(["An offer to answer", "Agents are waiting on you", "Time for a nudge", "Housekeeping", "Your tasks"]);
    expect(g.find((x) => x.id === "house")!.folded).toBe(true);
  });
  it("every task appears exactly once", () => {
    expect(g.flatMap((x) => x.tasks).length).toBe(TASKS.length);
  });
});

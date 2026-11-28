/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v1 · Phase 2 — THE NUDGE DESK, ONE STEP. The workspace is rendered with a nudge task open (the store
 * mocked), and the flow is built as the desk builds it (`buildFlow`) to check what a pick fills and what Log it saves.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import { forgetTodoTask, rememberTodoTask, todoTaskScope } from "../../../lib/todoArrival";
import { agoWords, nudgeAnswers, nudgeDayWord, nudgeFacts, nudgeHawkLine } from "../../../lib/todoNudgeDesk";
import { addDays, offWeekend } from "../../../lib/queryActions/dates";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const agent = (id: string, name: string, extra: Partial<Agent> = {}): Agent => ({ id, userId: "u1", name, agency: "Foxglove Literary", status: "Active", createdAt: iso(-200), updatedAt: iso(-200), ...extra } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);
const seed: { tasks: Task[]; queries: Query[]; agents: Agent[] } = { tasks: [], queries: [], agents: [] };

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true, tasksReady: true, tasksReadFailed: false,
    tasks: seed.tasks, userTasks: [], queries: seed.queries, agents: seed.agents, manuscripts: [{ id: "m1", userId: "u1", title: "The Marsh" }], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";
import { buildFlow, type Answers } from "./wsFlows";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const WILL = () => { seed.agents = [agent("a3", "William Fox", { responseTimeWeeks: 8 } as Partial<Agent>)]; seed.queries = [query("q3", "a3", QueryStatus.QUERIED)]; seed.tasks = [task("t3", "nudge_overdue", "q3")]; };
const openNudge = () => {
  const k = /data-tws-row="([^"]+)"[^>]*data-kind="nudge"/.exec(render())?.[1] ?? null;
  expect(k).not.toBeNull();
  rememberTodoTask(todoTaskScope("u1", "m1"), k);
  return render();
};
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; forgetTodoTask(); });

describe("the nudge desk renders as one step", () => {
  it("the hawk, the sentence with its blank, three clean answers; no rail, no numbers, no check step; Log it disabled", () => {
    WILL();
    const html = openNudge();
    const desk = html.slice(html.indexOf('data-tws="desk"'));
    expect(desk).toContain('data-twn="hawk"');
    expect(text(desk)).toMatch(/Foxglove Literary’s 8 weeks were up on \d{1,2} \w{3}, and William hasn’t replied\. Once you’ve nudged William, tell me when and I’ll log it\./);
    expect(desk).toMatch(/data-twn="sentence">I nudged William <span class="twn-blank"/);
    const ans = [...desk.matchAll(/data-twn-when="(\w+)"><b>([^<]+)<\/b><small>([^<]+)<\/small><kbd aria-hidden="true">(\d)<\/kbd>/g)].map((m) => `${m[1]}|${m[2]}|${m[4]}`);
    expect(ans).toEqual(["today|Today|1", "yesterday|Yesterday|2", "other|Another day|3"]);
    expect(desk).not.toContain('class="tws-rail"');
    expect(desk).not.toContain("Check it, then log it");
    expect(desk).not.toContain("Next →");
    expect(desk).not.toContain('data-twn="quiet"');
    expect(/data-tws="footer"[\s\S]*?<\/div>/.exec(html)?.[0]).toMatch(/data-log="" disabled="">Log it</);
  });
});

describe("a pick fills the save's own answers; Log it waits for it (logic)", () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const q = query("q3", "a3", QueryStatus.QUERIED);
  const a = agent("a3", "William Fox", { responseTimeWeeks: 8 } as Partial<Agent>);
  const t = { key: "t3", kind: "nudge", group: "nudge", title: "Nudge William", first: "William", agentName: "William Fox", agency: "Foxglove Literary", query: q, agent: a, dueDays: -10, quietDays: null, type: null, hay: "", item: {} } as never;
  const flowFor = (A: Answers, set: (p: Answers) => void = () => {}) => buildFlow({
    t, A, set, today, uid: null, userFirst: "Nick", queries: [q], agents: [a], manuscripts: [], db: {} as never, snoozeFor: async () => null, waitCeiling: 30, said: () => {}, nudgedOn: null, suggestion: null,
  } as never, { openPartial: () => {}, openCard: () => {}, openOther: null });
  it("nothing picked: no day, so Log it is disabled (the footer reads nd.picked)", () => {
    const nd = flowFor({}).nudgeDesk!;
    expect(nd.picked).toBeNull();
    expect(nd.when).toBeNull();
  });
  it("Today, Yesterday and Another day fill `sent` and `date` — the answers the questions fill — so the save is unchanged", () => {
    const got: Answers[] = [];
    const nd = flowFor({}, (p) => got.push(p)).nudgeDesk!;
    nd.pick("today"); nd.pick("yesterday"); nd.pick("other"); nd.pick("other", addDays(today, -4));
    expect(got).toEqual([
      { when: "today", sent: true, date: ymd(today) },
      { when: "yesterday", sent: true, date: ymd(addDays(today, -1)) },
      { when: "other", sent: undefined, date: undefined },
      { when: "other", sent: true, date: ymd(addDays(today, -4)) },
    ]);
  });
  it("picked: the day, and the save's own close-it date for it (offWeekend(addDays(day, 28)))", () => {
    const y = addDays(today, -1);
    const nd = flowFor({ when: "yesterday", sent: true, date: ymd(y) }).nudgeDesk!;
    expect(ymd(nd.picked!)).toBe(ymd(y));
    expect(ymd(nd.then)).toBe(ymd(offWeekend(addDays(y, 28))));
    expect(flowFor({ when: "other", sent: undefined, date: undefined }).nudgeDesk!.picked, "Another day with no day yet").toBeNull();
  });
  const src = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8");
  it("the footer's Log it is disabled until a day is picked and runs the flow's own commit", () => {
    expect(src).toContain('disabled={!nd.picked || busy || logged} onClick={() => void logIt()}');
  });
  it("the save itself is untouched: the commit is saveNudgeSent with nudgePlan, in the drawer's snapshot", () => {
    const fl = readFileSync(join(__dirname, "wsFlows.tsx"), "utf8");
    expect(fl).toContain("const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, sent, then)));");
    expect(fl).toContain("const NUDGE_THEN_DAYS = 28;");
  });
});

describe("the words (pure)", () => {
  const today = new Date(2026, 10, 28);
  it("the hawk's line: with a reply time, without one, and for a partial", () => {
    const f = { first: "William", agencyOr: "Foxglove Literary", sent: new Date(2026, 5, 3), sentWhat: "query" as const, weeks: 8, expected: new Date(2026, 6, 29) };
    expect(nudgeHawkLine(f)).toBe("Foxglove Literary’s 8 weeks were up on 29 Jul, and William hasn’t replied. Once you’ve nudged William, tell me when and I’ll log it.");
    expect(nudgeHawkLine({ ...f, weeks: null, expected: null })).toBe("William hasn’t replied since you queried on 3 Jun. Once you’ve nudged William, tell me when and I’ll log it.");
    expect(nudgeHawkLine({ ...f, sentWhat: "partial", weeks: 12 })).toBe("The 12 weeks for your partial were up on 29 Jul, and William hasn’t replied. Once you’ve nudged William, tell me when and I’ll log it.");
  });
  it("the agency, or the agent's name where there is none", () => {
    const f = nudgeFacts({ status: QueryStatus.QUERIED, dateSent: "2026-06-03" } as unknown as Query, { name: "William Fox", agency: "" } as unknown as Agent, "William");
    expect(f.agencyOr).toBe("William Fox");
    expect(f.weeks, "no reply time stored").toBeNull();
  });
  it("the answers' days, the sentence's day word, the ago words", () => {
    expect(nudgeAnswers(today, null).map((a) => a.sub)).toEqual(["Sat 28 Nov", "Fri 27 Nov", "Pick the day"]);
    expect(nudgeDayWord(today, today)).toBe("today");
    expect(nudgeDayWord(new Date(2026, 10, 27), today)).toBe("yesterday");
    expect(nudgeDayWord(new Date(2026, 10, 25), today)).toBe("on Wed 25 Nov");
    expect([14, 35, 7, 49, 62, 122].map(agoWords)).toEqual(["two weeks", "five weeks", "a week", "seven weeks", "two months", "four months"]);
  });
});

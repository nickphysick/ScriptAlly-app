/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v2 (re-pointed from v1, whose one-sentence step, fold and after-pick timeline v2 replaces) — THE NUDGE
 * DESK: it's overdue; send it yourself and confirm; tell us when. The workspace is rendered with a nudge task open (the
 * store mocked), and the flow is built as the desk builds it (`buildFlow`) to check the steps' gating and what Log it saves.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import { forgetTodoTask, rememberTodoTask, todoTaskScope } from "../../../lib/todoArrival";
import { agoWords, nudgeAnswers, nudgeDayWord, nudgeFacts, nudgeTimeline } from "../../../lib/todoNudgeDesk";
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

describe("the nudge desk renders: overdue, then the two steps", () => {
  it("the hawk beside the headline (no bubble), step 1 open with I've sent it, step 2 locked, Log it disabled and on the right", () => {
    WILL();
    const html = openNudge();
    const desk = html.slice(html.indexOf('data-tws="desk"'));
    expect(desk).toMatch(/data-twn="context"><img src="\/images\/todo\/mentor\.webp" alt=""\/><div><h2>William’s reply is <em>overdue<\/em>\.<\/h2><p>Send a nudge, then log it below\.<\/p>/);
    expect(desk, "no speech bubble on the nudge desk").not.toContain("tws-mnote");
    expect(desk).toMatch(/data-st="on" data-twn-step="send"/);
    expect(text(desk)).toContain("Send William a nudge From your own email, the way you sent the query: a short note asking if it reached them.");
    expect(desk).toMatch(/class="sp-btn sp-btn--line twn2-sent" data-twn="sent" aria-pressed="false">I’ve sent it</);
    expect(desk).toMatch(/data-st="off" data-twn-step="when" aria-disabled="true"/);
    const ans = [...desk.matchAll(/data-twn-when="(\w+)" disabled="" tabindex="-1"><span class="twn2-ic">[\s\S]*?<\/span><b>([^<]+)<\/b><small>([^<]+)<\/small>/g)].map((m) => `${m[1]}|${m[2]}`);
    expect(ans).toEqual(["today|Today", "yesterday|Yesterday", "other|Another day"]);
    expect(desk, "v1's sentence is gone").not.toContain("I nudged William");
    expect(desk, "v1's quiet line is gone").not.toContain("It goes on");
    const foot = /data-tws="footer"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
    expect(foot).toContain('data-twn-foot=""');
    expect(foot).toMatch(/data-log="" disabled="">Log it</);
  });
});

describe("the steps' gating (logic)", () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const q = query("q3", "a3", QueryStatus.QUERIED);
  const a = agent("a3", "William Fox", { responseTimeWeeks: 8 } as Partial<Agent>);
  const t = { key: "t3", kind: "nudge", group: "nudge", title: "Nudge William", first: "William", agentName: "William Fox", agency: "Foxglove Literary", query: q, agent: a, dueDays: -10, quietDays: null, type: null, hay: "", item: {} } as never;
  const flowFor = (A: Answers, set: (p: Answers) => void = () => {}) => buildFlow({
    t, A, set, today, uid: null, userFirst: "Nick", queries: [q], agents: [a], manuscripts: [], db: {} as never, snoozeFor: async () => null, waitCeiling: 30, said: () => {}, nudgedOn: null, suggestion: null,
  } as never, { openPartial: () => {}, openCard: () => {}, openOther: null });
  it("step 2 is locked until step 1 is confirmed: a pick before it does nothing", () => {
    const got: Answers[] = [];
    const nd = flowFor({}, (p) => got.push(p)).nudgeDesk!;
    expect(nd.sent).toBe(false);
    nd.pick("today"); nd.pick("other", addDays(today, -3));
    expect(got).toEqual([]);
  });
  it("I've sent it confirms step 1 (the questions' own `sent`); a pick fills `date`, so the save reads its own answers", () => {
    const got: Answers[] = [];
    flowFor({}, (p) => got.push(p)).nudgeDesk!.confirm();
    const nd = flowFor({ sent: true }, (p) => got.push(p)).nudgeDesk!;
    nd.pick("today"); nd.pick("yesterday"); nd.pick("other"); nd.pick("other", addDays(today, -4));
    expect(got).toEqual([
      { sent: true },
      { when: "today", date: ymd(today) },
      { when: "yesterday", date: ymd(addDays(today, -1)) },
      { when: "other", date: ymd(addDays(today, -4)) },
    ]);
  });
  it("un-confirming step 1 clears step 2's answer (and so Log it is disabled again)", () => {
    const got: Answers[] = [];
    const nd = flowFor({ sent: true, when: "today", date: ymd(today) }, (p) => got.push(p)).nudgeDesk!;
    expect(nd.picked).not.toBeNull();
    nd.confirm();
    /* toStrictEqual: toEqual would let `{ sent: undefined }` pass for this (undefined keys count as absent) */
    expect(got).toStrictEqual([{ sent: undefined, when: undefined, date: undefined }]);
    expect(Object.keys(got[0]).sort()).toEqual(["date", "sent", "when"]);
    expect(flowFor({}).nudgeDesk!.picked).toBeNull();
  });
  it("both steps done: the day, and the save's own next-reminder date (offWeekend(addDays(day, 28)))", () => {
    const y = addDays(today, -1);
    const nd = flowFor({ sent: true, when: "yesterday", date: ymd(y) }).nudgeDesk!;
    expect(ymd(nd.picked!)).toBe(ymd(y));
    expect(ymd(nd.then)).toBe(ymd(offWeekend(addDays(y, 28))));
    expect(flowFor({ when: "yesterday", date: ymd(y) }).nudgeDesk!.picked, "a day without step 1 is not a pick").toBeNull();
  });
  const src = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8");
  it("Log it is disabled until both steps are done (nd.picked needs both) and runs the flow's own commit", () => {
    expect(src).toContain('disabled={!nd.picked || busy || logged} onClick={() => void logIt()}');
  });
  it("keys 1, 2, 3 pick only while step 2 is unlocked", () => {
    expect(src).toContain('if (nd && nd.sent && tab === "todo" && !held && !adding && !pop && ["1", "2", "3"].includes(e.key)) {');
  });
  it("the save itself is untouched: saveNudgeSent with nudgePlan, in the drawer's snapshot; 28 days", () => {
    const fl = readFileSync(join(__dirname, "wsFlows.tsx"), "utf8");
    expect(fl).toContain("const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, sent, then)));");
    expect(fl).toContain("const NUDGE_THEN_DAYS = 28;");
  });
  it("Log it sits on the right of the footer", () => {
    const css = readFileSync(join(__dirname, "todoNudgeDesk.css"), "utf8");
    expect(css).toContain('.tws .tws-wf[data-twn-foot] .tws-go[data-tws="primary"] { margin-left: auto; }');
  });
});

describe("the words (pure)", () => {
  const today = new Date(2026, 10, 28);
  it("the agency, or the agent's name where there is none; no reply time stored is null", () => {
    const f = nudgeFacts({ status: QueryStatus.QUERIED, dateSent: "2026-06-03" } as unknown as Query, { name: "William Fox", agency: "" } as unknown as Agent, "William");
    expect(f.agencyOr).toBe("William Fox");
    expect(f.weeks).toBeNull();
  });
  it("the answers' days, the day word, the ago words", () => {
    expect(nudgeAnswers(today, null).map((x) => x.sub)).toEqual(["Sat 28 Nov", "Fri 27 Nov", "Pick the day"]);
    expect(nudgeAnswers(today, new Date(2026, 10, 25))[2].sub).toBe("Wed 25 Nov");
    expect(nudgeDayWord(today, today)).toBe("today");
    expect(nudgeDayWord(new Date(2026, 10, 27), today)).toBe("yesterday");
    expect(nudgeDayWord(new Date(2026, 10, 25), today)).toBe("on Wed 25 Nov");
    expect([14, 35, 7, 49, 62, 122].map(agoWords)).toEqual(["two weeks", "five weeks", "a week", "seven weeks", "two months", "four months"]);
  });
});

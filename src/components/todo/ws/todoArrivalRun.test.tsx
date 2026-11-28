/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 · Phase 2 — "WHERE TO START", ON THE PAGE. The workspace is rendered (`renderToStaticMarkup`, the store
 * mocked with two requests and a nudge) and the run-through's pure parts (lib/todoArrival) are called as the page calls
 * them: the hawk's line, the piles, Start, the waiting line's axis, labels and bracket.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import {
  forgetTodoTask, greetingFor, hawkLine, lineAxis, lineLabels, longDay, numberWord, pileSub, runPiles, startLabel, type LinePoint, type Pile,
} from "../../../lib/todoArrival";
import type { WsTask } from "../../../lib/todoWs";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const agent = (id: string, name: string): Agent => ({ id, userId: "u1", name, agency: `${name} Literary`, status: "Active", createdAt: iso(-200), updatedAt: iso(-200) } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);
const AGENTS = [agent("a1", "Greg Panetta"), agent("a2", "Jonathan Marsh"), agent("a3", "William Fox")];
const QUERIES = [
  query("q1", "a1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: iso(-2).slice(0, 10) } as Partial<Query>),
  query("q2", "a2", QueryStatus.FULL_REQUESTED, { fullRequestedDate: iso(-4).slice(0, 10) } as Partial<Query>),
  query("q3", "a3", QueryStatus.QUERIED),
];
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

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
const populated = () => { seed.agents = AGENTS; seed.queries = QUERIES; seed.tasks = [task("t1", "partial_requested", "q1"), task("t2", "full_requested", "q2"), task("t3", "nudge_overdue", "q3")]; return render(); };
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; forgetTodoTask(); });
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const desk = (html: string) => html.slice(html.indexOf('data-tws="desk-col"'));

describe("Where to start renders, populated (smoke)", () => {
  it("the heading, today's date, the hawk, Start, and a pile per group in the tray's order", () => {
    const html = populated();
    const d = desk(html);
    expect(d).toContain(">Where to start</h2>");
    expect(d).toContain(`>${longDay(new Date())}</em>`);
    expect(text(d)).toMatch(new RegExp(`${greetingFor(new Date())}, Nick\\. Two agents are waiting on you for pages, so they come first\\. (Greg|Jonathan) asked \\d+ days ago\\.`));
    expect(text(d)).toMatch(/Start with (Greg|Jonathan)/);
    expect(text(d)).toContain("or choose any task from the list");
    const piles = [...d.matchAll(/data-twa-pile="([^"]+)"/g)].map((m) => m[1]);
    expect(piles).toEqual(["wait", "nudge"]);
    expect(text(d)).toContain("They asked for pages. Send them, then log it.");
    expect(text(d)).toContain("Replies that are overdue. A short follow-up each.");
    expect(text(d)).toContain("How long each has been on your list");
    expect(d, "no sample-figures line").not.toMatch(/sample figures/i);
  });
  it("no desk card and no navy bar while Where to start shows", () => {
    const d = desk(populated());
    expect(d).not.toContain('class="tws-wsx');
    expect(d).not.toContain('class="tws-wh');
  });
  it("the hawk wears the first task's stage colour (the desk's own .tws-mnote)", () => {
    const d = desk(populated());
    expect(d).toMatch(/class="tws-mnote twa-mnote" data-tws="hawk" data-twa="hawk" data-tws58-stage="(partial|full)"/);
  });
  it("the hawk never says it will watch or keep an eye out", () => {
    const lib = readFileSync(join(__dirname, "..", "..", "..", "lib", "todoArrival.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(lib).not.toMatch(/\bwatch|keep an eye|keep track|I'll check|I’ll check/i);
  });
  it("a nudge first: its own line", () => {
    seed.agents = AGENTS; seed.queries = QUERIES; seed.tasks = [task("t3", "nudge_overdue", "q3")];
    expect(text(desk(render()))).toMatch(/One nudge is due\. William has waited longest\./);
  });
});

describe("the run-through's parts (pure)", () => {
  it("greeting by local time", () => {
    const at = (h: number, m = 0) => new Date(2026, 10, 28, h, m);
    expect(greetingFor(at(11, 59))).toBe("Morning");
    expect(greetingFor(at(12))).toBe("Afternoon");
    expect(greetingFor(at(17, 59))).toBe("Afternoon");
    expect(greetingFor(at(18))).toBe("Evening");
    expect(longDay(at(9))).toBe("Saturday 28 November");
    expect(numberWord(3)).toBe("Three");
    expect(numberWord(14)).toBe("14");
  });
  const T = (key: string, group: WsTask["group"], kind: WsTask["kind"] = "own", extra: Partial<WsTask> = {}) => ({ key, group, kind, title: key, first: "", agentName: "", agency: "", ...extra } as WsTask);
  it("piles: groups with tasks, in the tray's order, housekeeping last; past four, the fourth is Everything else", () => {
    const secs = [
      { id: "wait", tasks: [T("w1", "wait", "send")] }, { id: "nudge", tasks: [T("n1", "nudge", "nudge")] }, { id: "quiet", tasks: [T("q1", "quiet", "quiet")] },
      { id: "house", tasks: [T("h1", "house", "fix")] }, { id: "yours", tasks: [T("y1", "yours")] },
    ];
    const p = runPiles(secs);
    expect(p.map((x) => x.id)).toEqual(["wait", "nudge", "quiet", "rest"]);
    expect(p[3].name).toBe("Everything else");
    expect(p[3].tasks.map((t) => t.key)).toEqual(["y1", "h1"]);
    expect(p[3].sub).toBe("Your tasks and housekeeping, together.");
    const q = runPiles([{ id: "wait", tasks: [] }, { id: "house", tasks: [T("h1", "house", "fix")] }, { id: "yours", tasks: [T("y1", "yours")] }]);
    expect(q.map((x) => x.id)).toEqual(["yours", "house"]);
    expect(q[1].quiet).toBe(true);
    expect(pileSub("house", [])).toBe("Gaps in your records. None of it is urgent.");
  });
  it("Start names the first task's agent, or none", () => {
    expect(startLabel(T("y1", "yours"))).toBe("Start");
    expect(startLabel(T("w1", "wait", "send", { agentName: "Greg Panetta", first: "Greg" }))).toBe("Start with Greg");
  });
  it("hawk lines for the groups Nick did not write", () => {
    const now = new Date(2026, 10, 28, 9);
    const pile = (id: Pile["id"], tasks: WsTask[]): Pile[] => [{ id, name: "", sub: "", tasks, quiet: false, groups: [] }];
    expect(hawkLine(pile("quiet", [T("q1", "quiet", "quiet"), T("q2", "quiet", "quiet")]), "Nick", now)).toBe("Morning, Nick. Two queries have gone quiet. Each one needs a decision from you: a nudge, or closing it.");
    expect(hawkLine(pile("yours", [T("y1", "yours")]), "Nick", now)).toBe("Morning, Nick. One of your own tasks is on the list, so start there.");
    expect(hawkLine(pile("yours", [T("y1", "yours")]), "", now)).toBe("Morning. One of your own tasks is on the list, so start there.");
  });
  it("the axis: Today to the oldest rounded up to the next 30 (at least 30), a tick every 30", () => {
    expect(lineAxis([])).toEqual({ max: 30, ticks: [0, 30] });
    expect(lineAxis([{ days: 6 }, { days: 122 }])).toEqual({ max: 150, ticks: [0, 30, 60, 90, 120, 150] });
    expect(lineAxis([{ days: 60 }]).max).toBe(60);
  });
  it("labels need 64px clear; the agents waiting for pages share one bracket within 20 days and carry no labels", () => {
    const P = (key: string, days: number, x: number, group: WsTask["group"], kind: WsTask["kind"]): LinePoint & { x: number } => ({ task: T(key, group, kind), days, group, x });
    const pts = [P("w1", 6, 60, "wait", "send"), P("w2", 14, 90, "wait", "send"), P("n1", 51, 300, "nudge", "nudge"), P("n2", 69, 340, "nudge", "nudge"), P("n3", 122, 600, "nudge", "nudge")];
    const r = lineLabels(pts);
    expect(r.bracket).toEqual({ from: 60, to: 90 });
    expect([...r.labelled].sort(), "read from the oldest: 69d and 122d keep theirs; 51d is 40px short of 69d").toEqual(["n2", "n3"]);
    const far = lineLabels([P("w1", 2, 20, "wait", "send"), P("w2", 40, 300, "wait", "send")]);
    expect(far.bracket, "more than 20 days apart: no bracket").toBeNull();
    expect([...far.labelled].sort()).toEqual(["w1", "w2"]);
  });
});

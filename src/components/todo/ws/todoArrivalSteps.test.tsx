/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 · Phase 4 — STEPS AHEAD ON A JOURNEY TASK'S DESK. The workspace is rendered with the card journey
 * hosted (the desktop) and not (the phone), a send task and a nudge opened as the writer opens them, and the pure step
 * lines called as the page calls them.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import { aheadSteps, asksLine, forgetTodoTask, rememberTodoTask, storedAsks, todoTaskScope } from "../../../lib/todoArrival";
import { CJ_SPECS } from "../../queries/centre/cardJourneySpecs";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const agent = (id: string, name: string): Agent => ({ id, userId: "u1", name, agency: `${name} Literary`, status: "Active", createdAt: iso(-200), updatedAt: iso(-200) } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);
const seed: { tasks: Task[]; queries: Query[]; agents: Agent[]; hosted: boolean } = { tasks: [], queries: [], agents: [], hosted: true };

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
/* the desktop hosts the card journeys (Card journeys v1); the phone does not */
vi.mock("../../../lib/queryPanelStore", async (orig) => ({ ...(await orig<typeof import("../../../lib/queryPanelStore")>()), cardJourneyHosted: () => seed.hosted }));
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
/** open the row whose title matches, as the writer does (the visit's memory, read on mount) */
const openRow = (title: string) => {
  const html = render();
  const k = [...html.matchAll(/data-tws-row="([^"]+)"[^>]*title="([^"]+)"/g)].find((m) => m[2] === title)?.[1] ?? null;
  expect(k, title).not.toBeNull();
  rememberTodoTask(todoTaskScope("u1", "m1"), k);
  return render();
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const footer = (html: string) => /data-tws="footer"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; seed.hosted = true; forgetTodoTask(); });

const GREG = () => {
  seed.agents = [agent("a1", "Greg Panetta"), agent("a3", "William Fox")];
  seed.queries = [
    query("q1", "a1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: iso(-10).slice(0, 10), materialsRequestedType: "pages", materialsRequestedQuantity: 10, requestSynopsis: true } as Partial<Query>),
    query("q3", "a3", QueryStatus.QUERIED),
  ];
  seed.tasks = [task("t1", "partial_requested", "q1"), task("t3", "nudge_overdue", "q3")];
};

describe("a send task on the desktop: steps ahead, and one button", () => {
  it("the lead, the journey's stages none answered (the agent ticked), the asks from what is stored, and the door under them", () => {
    GREG();
    const html = openRow("Send Greg your partial");
    const t = text(html);
    expect(t).toContain("Mark sent takes you through this, one step at a time:");
    const steps = [...html.matchAll(/data-st="(done|todo)" data-twa-step="([^"]+)"/g)].map((m) => `${m[2]}:${m[1]}`);
    expect(steps).toEqual(["agent:done", "went:todo", "sent:todo", "reply:todo", "log:todo"]);
    expect(t).toContain("Greg Panetta · the agent");
    expect(t).toContain("What went Greg asked for 10 pages and a synopsis");
    expect(t).toContain("When you sent it");
    expect(t).toContain("When Greg might reply");
    expect(t).toContain("Check it, then log it");
    expect(html.match(/data-twa="door"/g)?.length).toBe(1);
  });
  it("the footer keeps Snooze and Dismiss and drops its copy of the door: one button for the one action", () => {
    GREG();
    const html = openRow("Send Greg your partial");
    const f = footer(html);
    expect(f).toContain("Snooze");
    expect(f).toContain("Dismiss");
    expect(f).not.toContain("Mark sent");
    expect(html.match(/>Mark sent</g)?.length, "the label once on the page").toBe(1);
  });
  it("every other task's footer is unchanged: a nudge keeps Next in the footer and shows no steps ahead", () => {
    GREG();
    const html = openRow("Nudge William");
    /* RE-POINTED (To-do nudge desk v1): a nudge is one step now — its footer holds Log it (disabled until a day is
       picked) where Next was; still no steps ahead */
    expect(footer(html)).toMatch(/data-log="" disabled="">Log it</);
    expect(footer(html)).not.toContain("Next →");
    expect(html).not.toContain('data-twa="ahead"');
  });
  it("the phone (the journey not hosted) keeps its inline flow", () => {
    GREG(); seed.hosted = false;
    const html = openRow("Send Greg your partial");
    expect(html).not.toContain('data-twa="ahead"');
    expect(html).toContain('data-tws="rail"');
  });
});

describe("the step lines (pure)", () => {
  it("the journeys' live stages, as listed by CJ_SPECS before anything is answered", () => {
    expect(CJ_SPECS.send!.stages({} as never, { othersN: 0 } as never)).toEqual(["agent", "went", "sent", "reply", "log"]);
    expect(CJ_SPECS.offer!.stages({} as never, { othersN: 0 } as never)).toEqual(["agent", "answer", "when", "log"]);
    const offer = aheadSteps(["agent", "answer", "when", "log"], { name: "Greg Panetta", first: "Greg" }, null).map((s) => `${s.strong ?? ""}${s.text}`);
    expect(offer).toEqual(["Greg Panetta · the agent", "Your answer to Greg", "When it happened", "Check it, then log it"]);
  });
  it("asks: nothing stored, no sub-line; stored on the log or the query, the journey's own labels", () => {
    expect(storedAsks({}, [])).toBeNull();
    expect(asksLine("Greg", storedAsks({}, []))).toBeNull();
    expect(asksLine("Greg", storedAsks({ materialsRequestedType: "pages", materialsRequestedQuantity: 10, requestSynopsis: true }, []))).toBe("Greg asked for 10 pages and a synopsis");
    const log = [{ resultingStatus: QueryStatus.PARTIAL_REQUESTED, materials: [{ kind: "sample", unit: "chapters", n: 3 }] }];
    expect(asksLine("Clara", storedAsks({ materialsRequestedType: "pages" }, log))).toBe("Clara asked for first 3 chapters");
    expect(asksLine("Clara", [{ kind: "full" }])).toBe("Clara asked for the full manuscript");
  });
});

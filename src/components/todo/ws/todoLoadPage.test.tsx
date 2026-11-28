/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do load v1 — THE PAGE NEVER SAYS "NOTHING" BEFORE IT KNOWS. The workspace is rendered (`renderToStaticMarkup`,
 * the store mocked) with the collections in but the task list not yet computed (`tasksReady: false` — the render that
 * used to draw "Nothing to do yet"), and again once loaded with no tasks at all.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";

const store = { tasksReady: false as boolean | undefined, tasksReadFailed: false, tasks: [] as Task[], queries: [] as Query[], agents: [] as Agent[] };
const ISO = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true, tasksReady: store.tasksReady, tasksReadFailed: store.tasksReadFailed,
    tasks: store.tasks, userTasks: [], queries: store.queries, agents: store.agents, manuscripts: [{ id: "m1", userId: "u1", title: "The Marsh" }], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";
import { forgetTodoTask, rememberTodoTask, todoTaskScope } from "../../../lib/todoArrival";

const render = (path = "/todo") => renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
afterEach(() => { store.tasksReady = false; store.tasksReadFailed = false; store.tasks = []; store.queries = []; store.agents = []; forgetTodoTask(); });
const EMPTY = [/all caught up/i, /Nothing yet/, /Nothing to do yet/, /Nothing snoozed/];

describe("while loading, no empty state", () => {
  it("the collections are in, the tasks are not: none of the empty states, and the page says it is busy", () => {
    store.tasksReady = false;
    const html = render();
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('data-tws="workspace"');
    for (const re of EMPTY) expect(html, String(re)).not.toMatch(re);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading your tasks");
  });
  it("the frame is drawn at once: the header's hawk and both buttons, the tabs with no count, the desk's navy bar", () => {
    const html = render();
    expect(html).toContain('data-tws56="art"');
    expect(html).toContain("+ Add a task");
    expect(html).toContain("Quick fill");
    expect(html).toMatch(/data-tws55-tab="todo"[^>]*>\s*To do<\/button>/);
    expect(html).not.toContain('data-tws="todo-count"');
    /* RE-POINTED (To-do arrival v1 · Phase 3): with no task asked for the page will open on "Where to start", so the
       outline is the run-through's (no navy bar); with a task asked for, the desk's navy bar as before */
    expect(html).toContain('data-twl-out="run"');
    expect(html).not.toContain('data-twl-out="desk"');
  });
  it("…and with a task asked for (the visit's memory), the desk's outline and its navy bar", () => {
    rememberTodoTask(todoTaskScope("u1", "m1"), "t1");
    const html = render();
    expect(html).toMatch(/data-twl-out="desk"[\s\S]*?class="tws-wh" data-band="wait"/);
    expect(html).not.toContain('data-twl-out="run"');
  });
});

describe("the header's ring while loading", () => {
  it("a list already in hand (a nudge) draws no ring segment and no count until the page has loaded", () => {
    store.agents = [{ id: "a1", userId: "u1", name: "William Fox", agency: "Fox Literary", status: "Active", createdAt: ISO(-200), updatedAt: ISO(-200), responseTimeWeeks: 4 } as unknown as Agent];
    store.queries = [{ id: "q1", userId: "u1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: ISO(-120).slice(0, 10), createdAt: ISO(-120), updatedAt: ISO(-10) } as unknown as Query];
    store.tasks = [{ id: "t1", priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId: "q1", taskType: "nudge_overdue", actionLabel: "", actionPath: "" } as Task];
    store.tasksReady = true;
    const loaded = render();
    expect(loaded, "loaded: the nudge draws its segment").toContain('data-tws56="seg"');
    store.tasksReady = false;
    const loading = render();
    expect(loading).not.toContain('data-tws56="seg"');
    expect(loading).not.toContain('data-tws="todo-count"');
  });
});

describe("loaded, and really empty", () => {
  it("loaded with zero tasks: the real empty state shows (\"Nothing to do yet\"), and the page is not busy", () => {
    store.tasksReady = true;
    const html = render();
    expect(html).toContain("Nothing to do yet");
    expect(html).not.toContain('aria-busy="true"');
    expect(html).not.toContain("data-twl-out");
  });
  it("a context with no tasksReady reads collectionsReady, as before", () => {
    store.tasksReady = undefined;
    expect(render()).toContain("Nothing to do yet");
  });
});

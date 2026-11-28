/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v1 · Phase 1 — THE WAY BACK. A "Where to start" row pinned above the first group while "Where to
 * start" exists; it wears the open look while it shows, and no task row does; a click or Esc from an open task goes
 * back. The workspace is rendered (`renderToStaticMarkup`, the store mocked); Esc's rule is called as the page calls it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, type UserTask } from "../../../types";
import { forgetTodoTask, rememberTodoTask, rememberedTodoTask, todoTaskScope } from "../../../lib/todoArrival";
import { escGoesBack, wayBackShown } from "../../../lib/todoNudgeDesk";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const own = (id: string, text: string): UserTask => ({ id, userId: "u1", text, done: false, dueDate: ymd(new Date()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as UserTask);
const store = { userTasks: [] as UserTask[] };
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true, tasksReady: true, tasksReadFailed: false,
    tasks: [], userTasks: store.userTasks, queries: [], agents: [], manuscripts: [], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
const SCOPE = todoTaskScope("u1", null);
const backTag = (html: string) => /<div class="tws-ti twn-back"[^>]*>/.exec(html)?.[0] ?? null;
const openTaskRows = (html: string) => [...html.matchAll(/<div class="tws-ti"[^>]*data-tws-row="([^"]+)"[^>]*aria-current="true"/g)].map((m) => m[1]);
afterEach(() => { store.userTasks = []; forgetTodoTask(); });

describe("the way back row (the page)", () => {
  it("present with tasks, pinned above the first group heading, wearing the open look while Where to start shows", () => {
    store.userTasks = [own("t1", "Tighten the synopsis"), own("t2", "Print the pages")];
    const html = render();
    const tag = backTag(html);
    expect(tag).not.toBeNull();
    expect(tag).toContain('aria-current="true"');
    expect(html.indexOf('data-twn="back"')).toBeLessThan(html.indexOf("data-tws-group="));
    expect(html).toContain("<b>Where to start</b><span>Your day at a glance</span>");
    expect(html).toMatch(/<kbd class="twn-kbd"[^>]*>Esc<\/kbd>/);
    expect(openTaskRows(html), "no task row is open").toEqual([]);
  });
  it("with a task open, the open look moves to that task's row", () => {
    store.userTasks = [own("t1", "Tighten the synopsis"), own("t2", "Print the pages")];
    rememberTodoTask(SCOPE, "t2");
    const html = render();
    expect(backTag(html)).not.toContain("aria-current");
    expect(openTaskRows(html)).toEqual(["t2"]);
  });
  it("absent with zero tasks", () => {
    expect(render()).not.toContain('data-twn="back"');
  });
  it("absent with only housekeeping (the rule the row reads)", () => {
    expect(wayBackShown([{ group: "house" }, { group: "house" }])).toBe(false);
    expect(wayBackShown([{ group: "house" }, { group: "nudge" }])).toBe(true);
    expect(wayBackShown([])).toBe(false);
  });
});

describe("going back (click and Esc)", () => {
  const base = { key: "Escape", selected: true, held: false, adding: false, startShown: true, modal: false };
  it("Esc from an open task goes back; nothing on Where to start itself, in a dialog, the new-task form, or mid-stamp", () => {
    expect(escGoesBack(base)).toBe(true);
    expect(escGoesBack({ ...base, selected: false }), "already on Where to start").toBe(false);
    expect(escGoesBack({ ...base, modal: true }), "a dialog keeps its Esc").toBe(false);
    expect(escGoesBack({ ...base, adding: true })).toBe(false);
    expect(escGoesBack({ ...base, held: true })).toBe(false);
    expect(escGoesBack({ ...base, startShown: false }), "no Where to start to go back to").toBe(false);
    expect(escGoesBack({ ...base, key: "Enter" })).toBe(false);
  });
  const src = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("Esc inside a text field, a pop, a menu or a journey keeps its own: those return before the way back is asked", () => {
    const guard = src.indexOf('if (location.pathname !== "/todo" || isEditableTarget(e.target) || escapeDepth() > 0');
    const esc = src.indexOf("if (escGoesBack({");
    expect(guard).toBeGreaterThan(0);
    expect(esc, "the guard comes first").toBeGreaterThan(guard);
    expect(src).toContain("escGoesBack({ key: e.key, selected: !!sel, held: !!held, adding, startShown: wayBackShown(all), modal: modalOpen() })");
  });
  it("a click on the row (or Esc) closes the open task: go(null), and the visit's memory follows", () => {
    expect(src).toContain("const goBack = () => { setRunLightState(null); go(null); };");
    expect(src).toMatch(/data-twn="back"[^>]*\n?\s*onClick=\{goBack\}/);
    expect(src).toContain("useEffect(() => { rememberTodoTask(arrScope, selKey); }, [arrScope, selKey]);");
    rememberTodoTask(SCOPE, null);
    expect(rememberedTodoTask(SCOPE)).toBeNull();
  });
});

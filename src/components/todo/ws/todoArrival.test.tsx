/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 · Phase 1 — NO TASK IS OPEN UNTIL THE WRITER CHOOSES. The workspace is rendered
 * (`renderToStaticMarkup`, the store mocked) on arrival, with a remembered task, with only housekeeping and with nothing,
 * and the pure decision (`deskMode`, `selectedTask`, the visit's memory) is called as the page calls it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, type UserTask } from "../../../types";
import { deskMode, forgetTodoTask, rememberTodoTask, rememberedTodoTask, selectedTask, todoTaskScope } from "../../../lib/todoArrival";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = ymd(new Date());
const own = (id: string, text: string): UserTask => ({ id, userId: "u1", text, done: false, dueDate: today, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as UserTask);
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
/* the scope the page uses: the account, and the active book (none here) */
const SCOPE = todoTaskScope("u1", null);
afterEach(() => { store.userTasks = []; forgetTodoTask(); });

describe("arrival opens no task (the page)", () => {
  it("with tasks: no row is open and the desk is Where to start", () => {
    store.userTasks = [own("t1", "Tighten the synopsis"), own("t2", "Print the pages")];
    const html = render();
    expect(html).toContain("Where to start");
    expect(html, "no row is open").not.toContain('aria-current="true"');
    expect(html, "no task's desk").not.toContain('data-tws="desk-title"');
    expect(html).not.toContain("Mark done");
  });
  it("coming back in the same visit reopens the task that was open", () => {
    store.userTasks = [own("t1", "Tighten the synopsis"), own("t2", "Print the pages")];
    rememberTodoTask(SCOPE, "t2");
    const html = render();
    expect(html).toContain('data-tws="desk-title">Print the pages<');
    expect(html).toContain("Mark done");
    expect(html).not.toContain("Where to start");
  });
  it("coming back after that task was finished: Where to start", () => {
    store.userTasks = [own("t1", "Tighten the synopsis")];
    rememberTodoTask(SCOPE, "t9-finished");
    const html = render();
    expect(html).toContain("Where to start");
    expect(html).not.toContain('data-tws="desk-title"');
  });
  it("another account's (or book's) memory is not read", () => {
    store.userTasks = [own("t1", "Tighten the synopsis")];
    rememberTodoTask(todoTaskScope("u2", null), "t1");
    expect(render()).toContain("Where to start");
  });
  it("zero tasks: Nothing to do yet, and no run-through", () => {
    const html = render();
    expect(html).toContain("Nothing to do yet");
    expect(html).not.toContain("Where to start");
  });
});

describe("the decision (pure)", () => {
  const T = (key: string, group: "wait" | "house" | "yours") => ({ key, group });
  it("deskMode: loading draws the outline; nothing → empty; only housekeeping → caught up; anything that needs you → run", () => {
    expect(deskMode({ loaded: false, all: [T("a", "wait")], selected: false })).toBe("outline");
    expect(deskMode({ loaded: true, all: [], selected: false })).toBe("empty");
    expect(deskMode({ loaded: true, all: [T("h1", "house"), T("h2", "house")], selected: false })).toBe("caught-up");
    expect(deskMode({ loaded: true, all: [T("h1", "house"), T("a", "wait")], selected: false })).toBe("run");
    expect(deskMode({ loaded: true, all: [T("a", "wait")], selected: true })).toBe("task");
  });
  it("selectedTask never falls back to the first task", () => {
    const order = [T("a", "wait"), T("b", "wait")];
    expect(selectedTask(order, order, null)).toBeNull();
    expect(selectedTask(order, order, "gone")).toBeNull();
    expect(selectedTask(order, order, "b")?.key).toBe("b");
  });
  it("the visit's memory is scoped and forgettable", () => {
    rememberTodoTask("u1|m1", "k");
    expect(rememberedTodoTask("u1|m1")).toBe("k");
    expect(rememberedTodoTask("u1|m2"), "a manuscript switch reads nothing").toBeNull();
    forgetTodoTask();
    expect(rememberedTodoTask("u1|m1")).toBeNull();
  });
});

describe("the page wires it (source)", () => {
  const src = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("the order[0] fallback is gone; the selection is selectedTask's", () => {
    expect(src).not.toMatch(/\?\?\s*order\[0\]\s*\?\?\s*null/);
    expect(src).toContain("const sel = selectedTask(order, all, selKey);");
  });
  it("the memory is memory: never localStorage, never sessionStorage", () => {
    const lib = readFileSync(join(__dirname, "..", "..", "..", "lib", "todoArrival.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(lib).not.toMatch(/localStorage|sessionStorage/);
  });
  it("the arrival key still opens its task (the one-shot key is read once the tasks are in)", () => {
    expect(src).toContain("if (id) { const t = all.find((x) => x.userTask?.id === id || x.key === id); if (t) go(t.key); }");
    expect(src).toMatch(/if \(location\.pathname !== "\/todo" \|\| !loaded\) return;/);
  });
});

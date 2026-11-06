/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — THE WORKSPACE RENDERS. A source-string test cannot see a page that throws on render; this renders
 * it (`renderToStaticMarkup`, the db mocked), empty and with one task of your own, and asserts one distinctive string
 * of chrome each time. It asserts almost nothing about appearance on purpose.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../../types";

const seed: { userTasks: unknown[] } = { userTasks: [] };
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true,
    tasks: [], userTasks: seed.userTasks, queries: [], agents: [], manuscripts: [], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }),
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

afterEach(() => { seed.userTasks = []; });

describe("the To-do workspace renders", () => {
  it("empty: the header, the tray's tabs and the first-run desk", () => {
    const html = render();
    expect(html).toContain("To-do list");
    expect(html).toContain("Snoozed");
    expect(html).toContain("Nothing to do yet");
  });
  it("with a task of your own: the row, the desk and its Mark done", () => {
    seed.userTasks = [{ id: "t1", userId: "u1", text: "Tighten the synopsis", done: false, dueDate: today, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    const html = render();
    expect(html).toContain("Tighten the synopsis");
    expect(html).toContain("Your tasks");
    expect(html).toContain("Mark done");
    expect(html).not.toContain("Nothing to do yet");
  });
  it("a note to self (no date) never reaches the list", () => {
    seed.userTasks = [{ id: "n1", userId: "u1", text: "A note to self", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    expect(render()).not.toContain("A note to self");
  });
});

/* To-do list v51 — THE SWAP: the desktop route mounts the workspace; nothing reaches the retired tray; the pop-up the
   phone still opens carries its own sheet. (A source lock, because these are facts about what imports what.) */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
describe("the desktop To-do is the workspace, and the tray is gone", () => {
  const root = join(__dirname, "..", "..", "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  it("TodoRoute renders TodoWorkspace on a desktop and TodoPhone below it", () => {
    const r = read("components/todo/TodoRoute.tsx");
    expect(r).toContain('import { TodoWorkspace } from "./ws/TodoWorkspace";');
    expect(r).toMatch(/desk \? <TodoWorkspace onNavigate=\{props\.onNavigate\} \/> : <TodoPhone \/>/);
  });
  it("no source file imports from the retired todo/v5 folder", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { if (n !== "node_modules") walk(p); continue; }
        if (!/\.(tsx?|css)$/.test(n)) continue;
        if (/from "[./]*(\.\.\/)?v5\/|todo\/v5\//.test(readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) hits.push(p);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
  it("SetAsidePop (the phone's snooze pop-up) imports its own sheet and its month", () => {
    const s = read("components/todo/SetAsidePop.tsx");
    expect(s).toContain('import "./setAsidePop.css";');
    expect(s).toContain('import { MonthCal, dayLabel } from "./MonthCal";');
  });
});

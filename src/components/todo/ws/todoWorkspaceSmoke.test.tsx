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
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null }, // plan rules v1
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
  /* Phone app v3: To-do has no page of its own on a phone (its tasks are Today's), so below 768px the slot is empty */
  it("TodoRoute renders TodoWorkspace on a desktop and nothing below it", () => {
    const r = read("components/todo/TodoRoute.tsx");
    expect(r).toContain('import { TodoWorkspace } from "./ws/TodoWorkspace";');
    expect(r).toMatch(/desk \? <TodoWorkspace onNavigate=\{props\.onNavigate\} \/> : null;/);
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

/* ⚠️ RULE CHANGED BY NICK (v51.1, 6 Nov): the tab no longer shows the badge's figure. The To do tab, the desk's "n/m" and
   the group headings all count the tray's rows; the sidebar badge keeps the "needs you" count and says so. */
describe("one count on the page, and the badge says what it counts", () => {
  const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const ws = () => strip(readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8"));
  /* v55 (D4): re-pointed — the To do count (and the page header's) is now EVERY task, so a filter or a search narrows
     the list and never the count; the n/m still counts the rows on show. With nothing filtered the two are equal (every
     task sits in one category section). The tab itself is WsTrayHead55's (todoV55 L3/L4 measure it on the page). */
  it("the tab and the header count every task; the n/m counts `seq`, the rows on show", () => {
    const w = ws();
    expect(w).toContain("const seq = useMemo(() => sections.flatMap((s) => s.tasks), [sections]);");
    expect(w).toContain("<WsTrayHead55 tab={tab} onTab={(t) => { setTab(t); setMenuState(false); }} todo={all.length}");
    expect(w).toContain("<WsHeader54 todo={all.length}");
    expect(w).toMatch(/<b>\{seqPos \+ 1\}<\/b>\/\{seq\.length\}/);
    expect(w, "the tab no longer reads the board's card count").not.toContain("boardFigures(");
  });
  it("the sidebar badges keep the needs-you count, with the tooltip \"{n} need you now\"", () => {
    const rail = strip(readFileSync(join(__dirname, "..", "..", "shell", "SidebarRail.tsx"), "utf8"));
    const side = strip(readFileSync(join(__dirname, "..", "..", "shell", "ShellSidebar.tsx"), "utf8"));
    expect(side).toContain("return boardFigures(cols).cards;");
    expect(rail).toContain("title={`${count} need you now`}");
  });
});

describe("the card preview is read-only", () => {
  it("the previewed card is inert, and the query card's footer and links are not drawn in it", () => {
    const pv = readFileSync(join(__dirname, "WsPreview.tsx"), "utf8");
    expect(pv).toMatch(/className="tws-pvz" data-tws="preview-card" inert /);
    const css = readFileSync(join(__dirname, "todoWs.css"), "utf8");
    /* v52 Part D: the preview draws the Query Centre's own card (QcQueryCard149 over the v152 thread); its controls are not drawn */
    expect(css).toContain('.tws-pvz [data-qc1522="footer"], .tws-pvz [data-qc152="reply"], .tws-pvz [data-qc152="pencil"], .tws-pvz [data-qc149c="close"]');
  });
});

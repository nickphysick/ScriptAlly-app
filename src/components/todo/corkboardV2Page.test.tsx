/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v2 — the page renders, in both its states (ref design-refs/corkboard-v13/). This repo's tests read
 * rendered markup (no DOM), so these hold what a string can: the header's words, the right-hand side's choice
 * between At a glance and Pick a colour, and the empty state. Geometry and behaviour are the e2e locks'
 * (tests/e2e/corkboardV2.measure.ts).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan, UserTask, TagDef } from "../../types";

const TAGS: TagDef[] = [{ id: "t-letter", label: "letter", colour: "pink" }];
const seed: { userTasks: UserTask[] } = { userTasks: [] };
vi.mock("../../lib/firebase", () => ({
  db: {}, auth: {},
  OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {},
}));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}),
}));
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true,
    tasks: [], userTasks: seed.userTasks, queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], dismissedTasks: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE, tags: TAGS },
    addUserTask: async () => undefined, updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined, setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined, updateUserPaths: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (id: string, over: Partial<UserTask> = {}): UserTask => ({
  id, userId: "u1", text: `Note ${id}`, done: false, createdAt: "2026-10-12T09:00:00Z", updatedAt: "", ...over,
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/corkboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);
/** Workspace headers v1: the phone's panel (the page below 768px), by a `matchMedia` that answers "narrow" */
const renderPhone = () => {
  const g = globalThis as unknown as { window?: unknown };
  const had = "window" in g, before = g.window;
  g.window = { ...((before as object) ?? {}), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  try { return render(); } finally { if (had) g.window = before; else delete g.window; }
};
const plain = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "’");

afterEach(() => { seed.userTasks = []; });

/* RE-POINTED (Workspace headers v1, 14 Nov): from 768px up the page opens on the shared navy header — "3 notes", "on
   your board", the two buttons, Pick a colour on the right. The panel below is the phone's, and these hold it there. */
/* RE-POINTED (Corkboard v15, 18 Nov): the right-hand block is the ref's `.brk` — up to three figures, a zero one not
   shown — or, with none above zero, Pick a colour and the five papers; an empty board says "Pick a colour to start". */
describe("the desktop's navy header", () => {
  it("the count, on your board, + New note and Add a task, and the figures that are not zero", () => {
    seed.userTasks = [note("a", { dueDate: "2026-11-09", colour: "butter" }), note("b"), note("c")];
    const html = render();
    expect(html).toContain('data-wsnh-page="corkboard"');
    expect(html).toContain(">3 notes</h1>");
    expect(plain(html)).toContain("on your board");
    expect(html).toContain('data-cb2="add-task"');
    expect(html).not.toContain('data-cb2="header"');
    expect(html).toContain('data-cb15="figures"');
    expect(html).toContain('data-fig="onTodo"');
    expect(html).not.toContain('data-fig="linked"');
    expect(html).not.toContain('data-fig="pinned"');
    expect(plain(html)).toContain("1on your to-do list");
    expect(html).not.toContain('data-cb15="pick"');
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("a manuscript link is not linked to an agent; an agent and a query are", () => {
    seed.userTasks = [note("a", { manuscriptId: "m1" }), note("b", { agentId: "x" }), note("c", { queryId: "q" })];
    const html = render();
    expect(plain(html)).toContain("2linked to agents");
  });

  it("with no figure above zero it is Pick a colour and the five papers", () => {
    seed.userTasks = [note("a"), note("b")];
    const html = render();
    expect(html).toContain('data-cb15="pick"');
    expect(plain(html)).toContain("Pick a colour");
    expect(plain(html)).not.toContain("Pick a colour to start");
    for (const name of ["butter", "blush", "powder", "sand", "stone"]) expect(html, name).toContain(`aria-label="New ${name} note"`);
    expect([...html.matchAll(/class="cb2-hsw"/g)].length).toBe(5);
  });
  it("empty: No notes yet, only + New note, and Pick a colour to start; the desk is day one", () => {
    seed.userTasks = [];
    const html = render();
    expect(html).toContain(">No notes yet</h1>");
    expect(html).not.toContain('data-cb2="add-task"');
    expect(html).toContain('data-wsnh="right"');
    expect(plain(html)).toContain("Pick a colour to start");
    expect(plain(html)).toContain("A few to get you going");
    expect(plain(html)).toContain("General querying advice to start your board. Keep any you like, or write your own.");
    expect([...html.matchAll(/data-cb15-example="/g)].length).toBe(3);
    expect([...html.matchAll(/>Keep this</g)].length).toBe(3);
    for (const t of ["Check each agent’s submission guidelines before you send.", "Send queries in small batches, five or so at a time.", "Address each agent by name, and say in a line why you chose them."]) {
      expect(plain(html).replace(/&#x27;/g, "’"), t).toContain(t);
    }
    expect(plain(html)).toContain("What you can do with a note");
    expect(html).toContain('data-cb15="ghost-new"');
  });
});

describe("the phone's panel", () => {
  it("counts the board and the notes on the to-do list", () => {
    seed.userTasks = [note("a", { dueDate: "2026-11-09", colour: "butter" }), note("b"), note("c")];
    const html = renderPhone();
    expect(html).toContain('data-cb2="header"');
    expect(plain(html)).toContain("Corkboard");
    expect(plain(html)).toContain("3 notes on your board. 1 is on your to-do list.");
    expect(html).toContain('data-cb2="add-task"');
  });

  it("At a glance shows only the rows that are not zero", () => {
    seed.userTasks = [note("a", { pinned: true }), note("b")];
    const html = renderPhone();
    expect(html).toContain('data-cb2="glance"');
    expect(html).toContain('data-glance="pinned"');
    expect(html).not.toContain('data-glance="linked"');
    expect(html).not.toContain('data-glance="onTodo"');
  });

  it("with no rows to show it is Pick a colour: five named swatches, each a button", () => {
    seed.userTasks = [note("a"), note("b")];
    const html = renderPhone();
    expect(html).toContain('data-cb2="pick"');
    expect(plain(html)).toContain("Pick a colour");
    for (const name of ["butter", "blush", "powder", "sand", "stone"]) expect(html, name).toContain(`aria-label="New ${name} note"`);
    expect([...html.matchAll(/class="cb2-sw"/g)].length).toBe(5);
  });

  it("the ring shows the art slot while the drawing is not supplied", () => {
    seed.userTasks = [note("a")];
    expect(plain(renderPhone())).toContain("Art to come");
  });
});

describe("the empty page", () => {
  it("Pick a colour to start, only + New note, and the four examples from the app's own data, each with Keep this", () => {
    seed.userTasks = [];
    /* RE-POINTED (Workspace headers v1): the sentence and "Pick a colour to start" are the phone panel's */
    const html = renderPhone();
    expect(plain(html)).toContain("Jot down anything worth remembering while you query.");
    expect(plain(html)).toContain("Pick a colour to start");
    expect(html).not.toContain('data-cb2="add-task"');
    expect(plain(html)).toContain("What writers keep here");
    expect(plain(html)).toContain("A few ideas to get you going. Keep any of them and it lands on your board, ready to change.");
    expect([...html.matchAll(/data-cb2-example=""/g)].length).toBe(4);
    expect([...html.matchAll(/>Keep this</g)].length).toBe(4);
    expect(html).not.toContain('data-cb2="wall"');
  });
});

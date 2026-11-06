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
const plain = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "’");

afterEach(() => { seed.userTasks = []; });

describe("the header", () => {
  it("counts the board and the notes on the to-do list", () => {
    seed.userTasks = [note("a", { dueDate: "2026-11-09", colour: "butter" }), note("b"), note("c")];
    const html = render();
    expect(html).toContain('data-cb2="header"');
    expect(plain(html)).toContain("Corkboard");
    expect(plain(html)).toContain("3 notes on your board. 1 is on your to-do list.");
    expect(html).toContain('data-cb2="add-task"');
  });

  it("At a glance shows only the rows that are not zero", () => {
    seed.userTasks = [note("a", { pinned: true }), note("b")];
    const html = render();
    expect(html).toContain('data-cb2="glance"');
    expect(html).toContain('data-glance="pinned"');
    expect(html).not.toContain('data-glance="linked"');
    expect(html).not.toContain('data-glance="onTodo"');
  });

  it("with no rows to show it is Pick a colour: five named swatches, each a button", () => {
    seed.userTasks = [note("a"), note("b")];
    const html = render();
    expect(html).toContain('data-cb2="pick"');
    expect(plain(html)).toContain("Pick a colour");
    for (const name of ["butter", "blush", "powder", "sand", "stone"]) expect(html, name).toContain(`aria-label="New ${name} note"`);
    expect([...html.matchAll(/class="cb2-sw"/g)].length).toBe(5);
  });

  it("the ring shows the art slot while the drawing is not supplied", () => {
    seed.userTasks = [note("a")];
    expect(plain(render())).toContain("Art to come");
  });
});

describe("the empty page", () => {
  it("Pick a colour to start, only + New note, and the four examples from the app's own data, each with Keep this", () => {
    seed.userTasks = [];
    const html = render();
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

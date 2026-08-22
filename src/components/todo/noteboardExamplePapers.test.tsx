/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — example papers on the sparse board (paper run, Phase 2).
 *
 * ⚠️ THE EXAMPLES ARE NOT THE USER'S DATA, and every rule here follows from that: they render
 * below every real note, never inside filtered results, never above three real notes, and a
 * dismissal is permanent — a board that re-offers what the writer sent away is arguing.
 *
 * ⚠️ CONTENT COMES FROM `NOTE_EXAMPLES` — REFERENCED, NEVER DUPLICATED. The sparse mockup ships
 * its own EXAMPLES array and its first item says "she wants" about an agent — the pronoun class
 * the drawer port already fixed once, with a declared divergence and a lock. Deriving from the
 * one module keeps that fix; copying the mockup's array would ship the violation back.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask } from "../../types";
import { NOTE_EXAMPLE_PAPERS, sparseExamples, NOTEBOARD_HINT, noteboardPrefs } from "../../lib/noteboard";
import { NOTE_EXAMPLES } from "./noteboardExamples";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const seed: { userTasks: UserTask[]; noteboard?: { dismissedExamples?: string[] } } = { userTasks: [] };
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
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE, tags: [],
      todoPrefs: seed.noteboard ? { noteboard: seed.noteboard } : undefined },
    addUserTask: async () => undefined, updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (id: string, day: string): UserTask => ({
  id, userId: "u1", text: `note ${id}`, done: false,
  createdAt: `2026-08-${day}T09:00:00Z`, updatedAt: `2026-08-${day}T09:00:00Z`,
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

/** The board's children as a KIND sequence — the whole arrangement, one string. */
const kinds = (html: string): string => {
  const at = html.indexOf("nb-board");
  expect(at, "no board").toBeGreaterThan(-1);           // the anchor, before the slice
  const board = html.slice(at, html.indexOf("nb-empty-search") > at ? html.length : html.length);
  const seq: string[] = [];
  for (const m of board.matchAll(/class="([^"]*)"/g)) {
    const c = m[1];
    if (/\bnb-ghost\b/.test(c)) seq.push("ghost");
    else if (/\bnb-exhint\b/.test(c)) seq.push("hint");
    else if (/\bnb-example\b/.test(c)) seq.push("example");
    else if (/\bnb-note\b/.test(c) && !/\bnb-example\b/.test(c)) seq.push("note");
  }
  return seq.join(" ");
};

afterEach(() => { seed.userTasks = []; seed.noteboard = undefined; });

describe("⚠️ one per colour, derived from the drawer's module — never the mockup's copy", () => {
  it("three papers, three colours, each body PRESENT in NOTE_EXAMPLES verbatim", () => {
    expect(NOTE_EXAMPLE_PAPERS).toHaveLength(3);
    expect(NOTE_EXAMPLE_PAPERS.map((p) => p.colour).sort()).toEqual(["pink", "sage", "yellow"]);
    const drawerBodies = new Set(NOTE_EXAMPLES.flatMap((g) => g.items.map((i) => i.body)));
    for (const p of NOTE_EXAMPLE_PAPERS) {
      expect(drawerBodies.has(p.body), `${p.id} body is not the drawer's — content was duplicated or drifted`).toBe(true);
    }
    /* stable ids — a dismissal keyed on content would return the day a word changed */
    expect(NOTE_EXAMPLE_PAPERS.map((p) => p.id)).toEqual(["ex-yellow", "ex-pink", "ex-sage"]);
    /* and the pronoun fix travelled — the mockup's own array says "she wants" about an agent */
    for (const p of NOTE_EXAMPLE_PAPERS) expect(p.body).not.toMatch(/\bshe\b|\bhe\b/);
  });

  it("sparse means FEWER THAN THREE, dismissals subtract, and three real notes end it", () => {
    expect(sparseExamples(0, []).map((p) => p.id)).toEqual(["ex-yellow", "ex-pink", "ex-sage"]);
    expect(sparseExamples(2, ["ex-pink"]).map((p) => p.id)).toEqual(["ex-yellow", "ex-sage"]);
    expect(sparseExamples(3, [])).toEqual([]);           // the boundary is exact
    expect(sparseExamples(2, ["ex-yellow", "ex-pink", "ex-sage"])).toEqual([]);
  });
});

describe("⚠️ the arrangement: ghost, all real notes, hint, examples — one sequence", () => {
  it("with 1 real note the whole ordered board reads ghost·note·hint·example×3", () => {
    seed.userTasks = [note("a", "12")];
    const html = render();
    expect(kinds(html)).toBe("ghost note hint example example example");
    expect(html).toContain(NOTEBOARD_HINT);
    /* the hint's words are the baked verbatim */
    expect(NOTEBOARD_HINT).toBe(
      "A few examples of what writers keep here — keep one to make it yours, or dismiss them. They retire on their own as your board fills.",
    );
  });

  it("with 3 real notes there are ZERO example elements — and the board is still there", () => {
    seed.userTasks = [note("a", "12"), note("b", "13"), note("c", "14")];
    const html = render();
    expect(kinds(html)).toBe("ghost note note note");
    expect(html).not.toMatch(/["\s`]nb-example["\s`]/);
    expect(html).not.toContain("nb-exhint");
  });

  it("a persisted dismissal subtracts before render — the store is read, not just written", () => {
    seed.userTasks = [note("a", "12")];
    seed.noteboard = { dismissedExamples: ["ex-pink", "ex-sage"] };
    expect(kinds(render())).toBe("ghost note hint example");
  });

  it("the reader is total: no user, no prefs, no noteboard key all read as nothing dismissed", () => {
    expect(noteboardPrefs(undefined).dismissedExamples).toEqual([]);
    expect(noteboardPrefs({} as never).dismissedExamples).toEqual([]);
    expect(noteboardPrefs({ todoPrefs: {} } as never).dismissedExamples).toEqual([]);
  });
});

describe("⚠️ the empty panel and the papers never teach at once", () => {
  it("an empty board shows the PAPERS, not the first-run panel", () => {
    /* measured live: with the board at zero the panel rendered and `.nb-board` never mounted, so
       the sparse state was unreachable — the examples could only ever be seen by someone who
       already had a note, which is precisely who least needs them */
    const html = render();
    expect(kinds(html)).toBe("ghost hint example example example");
    expect(html).not.toContain("Nothing pinned yet");
  });

  it("…and the panel returns once every paper is dismissed — the board has nothing left to say", () => {
    seed.noteboard = { dismissedExamples: ["ex-yellow", "ex-pink", "ex-sage"] };
    const html = render();
    expect(html).toContain("Nothing pinned yet");
    expect(html).not.toMatch(/["\s`]nb-example["\s`]/);
  });
});

describe("⚠️ keep and dismiss write THROUGH the merge — never over the map", () => {
  it("the page spreads the existing todoPrefs and the existing noteboard sub-map", () => {
    const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
    /* replacing todoPrefs wholesale would silently drop the desk behaviours and the To-do
       list's view prefs — the live map already carries listView */
    expect(page).toContain("...currentUser?.todoPrefs");
    expect(page).toContain("saveNoteboardPrefs");
    expect(page).toContain("Kept — it’s yours to edit now.");
    /* keep goes through the NORMAL create path — addUserTask + the colour follow-up */
    const fn = page.slice(page.indexOf("const keepExample"));
    expect(page.indexOf("const keepExample")).toBeGreaterThan(-1);
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(body).toContain("addUserTask(");
    expect(body).toContain("setUserTaskColour");
  });
});

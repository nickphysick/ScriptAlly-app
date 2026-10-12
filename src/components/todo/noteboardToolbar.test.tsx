/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the tool row (build Phase 5).
 *
 * ⚠️ THE CHIPS ARE DERIVED FROM THE TAGS IN USE, never from the stored taxonomy. A tag the writer
 * defined and has not put on a note is not a way to narrow this board — offering it would give
 * them a filter that can only ever return nothing. The DEFS still supply the labels and colours,
 * because the taxonomy is real and is where a tag's identity lives; what is derived is which of
 * them appear.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask, TagDef } from "../../types";
import { noteTagChips } from "../../lib/noteboard";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
const css = decls(readFileSync(join(here, "todoNoteboard.css"), "utf8"));

const TAGS: TagDef[] = [
  { id: "t-letter", label: "letter", colour: "pink" },
  { id: "t-agents", label: "agents", colour: "sage" },
  { id: "t-comps", label: "comps", colour: "butter" },
  { id: "t-unused", label: "zzz-never-used", colour: "latte" },
];

const seed: { userTasks: UserTask[]; tags: TagDef[] } = { userTasks: [], tags: TAGS };
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
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE, tags: seed.tags },
    addUserTask: async () => undefined, updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined, setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (id: string, text: string, tags?: string[]): UserTask => ({
  id, userId: "u1", text, done: false, createdAt: "2026-08-12T09:00:00Z", updatedAt: "", ...(tags ? { tags } : {}),
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

afterEach(() => { seed.userTasks = []; seed.tags = TAGS; });

describe("⚠️ the chip row is DERIVED — #All, then the tags actually in use", () => {
  it("alphabetical, deduped, and a defined-but-unused tag is absent", () => {
    /* seeded deliberately out of alphabetical order, with one tag used twice and one tag defined
       and never applied — three properties one list can demonstrate at once */
    const notes = [
      note("a", "one", ["t-letter"]), note("b", "two", ["t-agents"]),
      note("c", "three", ["t-letter"]), note("d", "four", ["t-comps"]),
    ];
    expect(noteTagChips(notes, TAGS).map((c) => c.label))
      .toEqual(["All", "agents", "comps", "letter"]);
  });

  it("no tags in use means the row is #All alone — never a control over nothing", () => {
    expect(noteTagChips([note("a", "bare")], TAGS).map((c) => c.label)).toEqual(["All"]);
  });

  it("the RENDERED row says the same thing, in the same order", () => {
    seed.userTasks = [note("a", "one", ["t-letter"]), note("b", "two", ["t-agents"])];
    const html = render();
    const at = html.indexOf('data-cb="filters"');
    expect(at, "no filter row").toBeGreaterThan(-1);        // the anchor, before the slice
    const stop = html.indexOf('data-cb="notes"', at);
    expect(stop, "no board after the row").toBeGreaterThan(at);
    const row = html.slice(at, stop);
    /* the ORDER is a property of the row, so it is read off the row. RE-POINTED (Corkboard v1): "All" has no
       hash (the ref's chip), and every chip states its count from the UNFILTERED list. */
    const labels = [">All <b>2</b>", ">#agents <b>1</b>", ">#letter <b>1</b>"];
    for (const [i, label] of labels.entries()) {
      expect(row.indexOf(label), label).toBeGreaterThan(-1);
      if (i > 0) expect(row.indexOf(label)).toBeGreaterThan(row.indexOf(labels[i - 1]));
    }
    expect(row).not.toContain("zzz-never-used");
  });
});

describe("⚠️ search reads the note's words, whatever case they are in", () => {
  it("a lowercase query finds a capitalised note, and a miss says so", () => {
    seed.userTasks = [note("a", "Mushens closed until October")];
    expect(render()).toContain("Mushens closed until October");
  });

  it("⚠️ filtering FADES, it does not hide — every pinned note stays mounted (Corkboard v1)", () => {
    /* RE-POINTED: "Nothing matches that search." belonged to a board that removed non-matches. Now a note
       outside the search or the chip stays where it is at 22%, and the "n of N notes" label says how many
       match — so there is no empty board for a sentence to explain. */
    expect(page).not.toContain("Nothing matches that search.");
    expect(page).toContain("pinned.map((n) =>");
    expect(page, "the board draws the filtered list").not.toMatch(/\{notes\.map\(/);
    expect(page).toContain('narrowing && !matching.has(n.id) ? " cb-dim" : ""');
    expect(css).toMatch(/\.cb-dim\s*\{\s*opacity:\s*0\.22;?\s*\}/);
  });
});

describe("⚠️ Board / Column is a segmented toggle — the sentence control is retired", () => {
  it("the Note control is three paper buttons, each named, each opening the ONE composer with its colour", () => {
    /* RE-POINTED (Corkboard v1): Board / Column is retired with the tool row. The claim that survives is the
       one about a control a screen reader can use: each square is a button with its own name. */
    expect(page).not.toContain("nb-viewtog");
    expect(page).not.toContain("Read as a column");
    seed.userTasks = [note("a", "one")];
    const html = render();
    for (const name of ["Pin a yellow note", "Pin a pink note", "Pin a sage note"]) expect(html, name).toContain(`aria-label="${name}"`);
    expect([...html.matchAll(/data-cb-pad="/g)].length).toBe(3);
    expect(page).toContain("onClick={() => openComposer({ colour: c })}");
  });

  it("the row under the header carries the Corkboard ref's controls: the add bar, find, the chips", () => {
    /* RE-POINTED (Corkboard v1): the tool row is replaced by the ref's row — "Add to your board" (Note in three
       papers, Task) on the left; Find a note and the tag chips on the right. Board/Column, Examples and the
       pink "Pin a note" have no place in it (reported for Nick; the examples drawer is reached from the empty
       state). */
    for (const control of ["cb-addrow", "cb-pads", "cb-sup", "cb-find", "cb-chip", "Add to your board", "Find a note"]) {
      expect(page, control).toContain(control);
    }
    for (const gone of ["nb-viewtog", "nb-search", ">Examples<", "Pin a note\n"]) expect(page, gone).not.toContain(gone);
    /* the dropdown the chips replaced is gone — bounded token, never a substring */
    expect(page).not.toMatch(/["\s`]nb-tagwrap["\s`]/);
  });
});

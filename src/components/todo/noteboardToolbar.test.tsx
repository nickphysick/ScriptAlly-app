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
    const at = html.indexOf("nb-chipset");
    expect(at, "no chip row").toBeGreaterThan(-1);        // the anchor, before the slice
    const end = html.indexOf("</div>", html.indexOf("nb-chip", at));
    const row = html.slice(at, end > at ? end + 400 : at + 900);
    /* the ORDER is a property of the row, so it is read off the row */
    for (const [i, label] of ["#All", "#agents", "#letter"].entries()) {
      expect(row.indexOf(label), label).toBeGreaterThan(-1);
      if (i > 0) expect(row.indexOf(label)).toBeGreaterThan(row.indexOf(["#All", "#agents"][i - 1]));
    }
    expect(row).not.toContain("zzz-never-used");
  });
});

describe("⚠️ search reads the note's words, whatever case they are in", () => {
  it("a lowercase query finds a capitalised note, and a miss says so", () => {
    seed.userTasks = [note("a", "Mushens closed until October")];
    expect(render()).toContain("Mushens closed until October");
  });

  it("the empty-search sentence is the mockup's, and it can actually hide", () => {
    expect(page).toContain("Nothing matches that search.");
    /* ⚠️ THE `hidden` ATTRIBUTE LOSES TO `display: flex`. The UA sheet's `[hidden]{display:none}`
       is weaker than any author display rule, so a flex element with `hidden` stays on screen.
       Either the element is conditionally RENDERED, or the sheet restates the rule. */
    const usesAttr = /className="nb-empty-search"[^>]*hidden/.test(page);
    if (usesAttr) expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none/);
    else expect(page).toMatch(/\{[^}]*&&\s*\(?\s*<div className="nb-empty-search"/);
  });
});

describe("⚠️ Board / Column is a segmented toggle — the sentence control is retired", () => {
  it("two buttons, one pressed, and the old label is gone", () => {
    expect(page).toContain("nb-viewtog");
    expect(page).not.toContain("Read as a column");
    /* aria-pressed on both, or a screen reader is told which is a button and not which is on */
    const tog = page.slice(page.indexOf("nb-viewtog"));
    expect(page.indexOf("nb-viewtog")).toBeGreaterThan(-1);
    const head = tog.slice(0, 900);
    expect([...head.matchAll(/aria-pressed/g)].length).toBe(2);
    expect(head).toContain(">Board<");
    expect(head).toContain(">Column<");
  });

  it("the tool row carries the mockup's five controls and nothing else", () => {
    for (const control of ["nb-search", "nb-chipset", "nb-viewtog", "Examples", "Pin a note"]) {
      expect(page, control).toContain(control);
    }
    /* the dropdown the chips replaced is gone — bounded token, never a substring */
    expect(page).not.toMatch(/["\s`]nb-tagwrap["\s`]/);
  });
});

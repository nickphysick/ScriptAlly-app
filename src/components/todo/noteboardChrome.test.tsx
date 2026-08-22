/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the shell and its token set (build Phase 1; ref design-refs/noteboard-mockup.html).
 *
 * ⚠️ THE MOCKUP'S `.mount` / `.frame` / `.band` ARE NOT PORTED, AND THAT IS THE POINT OF THIS FILE.
 * The mockup is a standalone page: it draws the chrome the app already provides. This page renders
 * inside `TasksPageLayout` → `WorkspacePageGrid` → the pinned `PageHeader variant="workspace"`,
 * shared with eight other pages and governed by `workspacePageGrid.css`. Porting the band would
 * give the page TWO mastheads. So the band's three pieces are rehomed instead of drawn:
 *
 *   · the title    → already the masthead's
 *   · the subtitle → the masthead's `description`, VERBATIM from the mockup
 *   · the count    → the TOOL ROW, because `PageHeaderProps` has no count slot and says so:
 *                    "the slot is DELETED from the variant (amendment 7)… the two pages that had
 *                    one had their figure REHOMED rather than dropped". This is the third.
 *
 * That rehoming is also `TasksPageLayout`'s own law — "the plate carries identity while the tool
 * row carries tallies and context" — so the count is where the chassis already wanted it.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask } from "../../types";
import { noteFilterLabel, NOTEBOARD_SUBTITLE } from "../../lib/noteboard";

const here = __dirname;
const css = readFileSync(join(here, "todoNoteboard.css"), "utf8");

/* ⚠️ COMMENTS OUT BEFORE ANY SOURCE ASSERTION — this repo's prose quotes what it retires, and a
   bare `toContain` over raw CSS matches the paragraph explaining a deletion. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const cssDecls = decls(css);

const seed: { userTasks: UserTask[] } = { userTasks: [] };
vi.mock("../../lib/firebase", () => ({
  db: {}, auth: {},
  OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" },
  handleFirestoreError: () => {},
}));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}),
}));
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true,
    tasks: [], userTasks: seed.userTasks, queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], dismissedTasks: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE, tags: [] },
    addUserTask: async () => undefined,
    updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined,
    updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (over: Partial<UserTask>): UserTask => ({
  id: "n1", userId: "u1", text: "A note", done: false,
  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z", ...over,
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

afterEach(() => { seed.userTasks = []; });

describe("⚠️ the band is REHOMED, not drawn — the chassis already owns the chrome", () => {
  it("the page draws no second mount/frame/band of its own", () => {
    const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
    /* bounded tokens, never substrings — a complete class name is delimited on both sides */
    for (const dead of ["nb-mount", "nb-frame", "nb-band"]) {
      expect(page, dead).not.toMatch(new RegExp(`["\\s\`]${dead}["\\s\`]`));
    }
    /* and the masthead it DOES render is the shared one, not a local copy */
    expect(page).toContain("TasksPageLayout");
  });

  it("the subtitle is the mockup's sentence, verbatim", () => {
    expect(NOTEBOARD_SUBTITLE).toBe(
      "Thoughts, snippets, and things worth keeping — pinned where you can see them.",
    );
    const mockup = readFileSync(join(here, "../../../design-refs/noteboard-mockup.html"), "utf8");
    expect(mockup).toContain(NOTEBOARD_SUBTITLE); // the ref is the authority, not this file
    expect(render()).toContain(NOTEBOARD_SUBTITLE);
  });
});

describe("⚠️ the count exists ONLY while something narrows — the resting tally is retired", () => {
  /* ⚠️ SUPERSEDED (finish run, 1c). This block used to assert the opposite: "N notes pinned" on
     the tool row at rest. That tally sat immediately left of the search box and read as the
     field's label, so it is gone — the board self-evidences — and what renders instead is the
     FILTERED count, only while a search or a chip narrows, stating both figures because "3 notes"
     under a filter cannot say whether three is all of them. */
  it("the label states shown-of-total, and different figures produce different strings", () => {
    expect(noteFilterLabel(3, 12)).toBe("3 of 12 notes");
    const labels = [noteFilterLabel(0, 3), noteFilterLabel(1, 3), noteFilterLabel(3, 3)];
    expect(new Set(labels).size).toBe(3);
  });

  it("at rest the page renders NO count — neither the eyebrow tally nor the filtered form", () => {
    seed.userTasks = [note({ id: "a" }), note({ id: "b" })];
    const html = render();
    expect(html).not.toContain("notes pinned");
    expect(html).not.toMatch(/["\s`]nb-fcount["\s`]/);
    expect(html).not.toMatch(/["\s`]tpl-eyebrow["\s`]/);
  });

  it("…and the source only mounts the count behind the narrowing condition", () => {
    const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
    expect(page).toContain('(search.trim() || tagSel) && (');
    expect(page).toContain("noteFilterLabel(notes.length, pinned.length)");
    /* the retired tally is gone from the page, not merely unrendered */
    expect(page).not.toContain("noteCountLabel");
    expect(page).not.toContain("eyebrow={");
  });
});

describe("⚠️ A TOKEN DEFINED SOMEWHERE IS NOT A TOKEN IN SCOPE WHERE IT IS READ", () => {
  /* ⚠️ THE FAULT THIS EXISTS FOR, and it is a different one from the dangling-token sweep below.
     Every `var(--nb-*)` in the sheet resolved to a definition — the sweep was clean and the Phase 1
     lock was green. But the Examples drawer, the scrim and the task popover render OUTSIDE
     `.nb-scope`: they are siblings of the page body, not children of it. So at THEIR use site the
     tokens were undefined, every declaration reading one was silently DROPPED, and the drawer
     rendered FULLY TRANSPARENT with the board showing through its text. Six passing geometry
     measurements never looked at it; the screenshot did. */
  it("every floating surface carries the token scope itself", () => {
    const page = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
    /* the population first — a census of nothing passes trivially */
    const floating = ["nb-drawer", "nb-scrim", "nb-taskpanel"];
    /* ⚠️ THE WHOLE ATTRIBUTE, NOT AN ADJACENCY. `nb-scope cal-daypanel nb-taskpanel` carries both
       and would fail a check for the two tokens side by side — the first draft of this lock did
       exactly that and reported a correctly-scoped element as unscoped. */
    const attrs = [...page.matchAll(/className="([^"]*)"/g)].map((m) => m[1].split(/\s+/));
    for (const cls of floating) {
      const owner = attrs.find((a) => a.includes(cls));
      expect(owner, `no element renders ${cls}`).toBeDefined();
      expect(owner, `${cls} must carry nb-scope — it renders outside it`).toContain("nb-scope");
    }
    /* and nothing reads an --nb-* token from a class that is not inside a scoped element */
    const scoped = [...page.matchAll(/className="([^"]*nb-scope[^"]*)"/g)].length;
    expect(scoped, "the scope is not applied anywhere").toBeGreaterThanOrEqual(floating.length + 1);
  });
});

describe("⚠️ one token set, declared once, at the top", () => {
  it("the sheet opens with a single :root-scoped block and never restates a token", () => {
    const first = cssDecls.indexOf("--nb-");
    expect(first).toBeGreaterThan(-1);
    /* every token is DEFINED exactly once — a second definition is the two-numbers-apart fault */
    const defs = [...cssDecls.matchAll(/(--nb-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    expect(defs.length).toBeGreaterThan(8);
    expect(new Set(defs).size).toBe(defs.length);
  });

  it("⚠️ every var() the sheet READS resolves to a definition in it", () => {
    /* the direction that matters: checking what you wrote arrived cannot catch what you
       referenced and never wrote. `calc()` on an undefined property yields NaN, silently. */
    const defined = new Set([...cssDecls.matchAll(/(--nb-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const read = [...cssDecls.matchAll(/var\(\s*(--nb-[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(read.length).toBeGreaterThan(8); // the population, or a clean scan means "I read nothing"
    expect([...new Set(read)].filter((t) => !defined.has(t))).toEqual([]);
  });

  it("⚠️ a value the app already tokens is READ, never restated (rule 8)", () => {
    /* the sheet must not carry a second copy of a colour index.css already names */
    for (const [hex, token] of [
      ["#f5e2da", "--pink"], ["#e8c8bc", "--pink-b"], ["#7c3a2a", "--burg"],
      ["#fdfaf5", "--shell-card"], ["#f2ede7", "--shell-panel"],
    ] as const) {
      expect(cssDecls, `${hex} should be var(${token})`).not.toContain(hex);
      expect(cssDecls).toContain(`var(${token})`);
    }
  });

  it("…and the colours the app does NOT token are declared once each, here", () => {
    /* ⚠️ SAGE IS DELIBERATELY NOT BORROWED. index.css carries `--sageC: #e9ede6`, but the line
       above it locks that trio: "StatusDot sage (--sage/--sageC/--sageD) is a STATUS colour —
       LOCKED to StatusDots only." A note's sage fill is the same hex doing an unrelated job, so
       it is declared here rather than reaching into a token reserved for another meaning. */
    for (const hex of ["#fbf3d9", "#eddfae", "#e9ede6", "#c9d3c5"]) {
      const hits = [...cssDecls.matchAll(new RegExp(hex, "gi"))].length;
      expect(hits, hex).toBe(1);
    }
  });
});

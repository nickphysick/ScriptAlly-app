/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the examples live in the DRAWER now (workflow run, Phase 1;
 * ref design-refs/noteboard-empty-state-v2.html).
 *
 * ⚠️ THE DRAWER DID NOT "REGAIN" GROUPED HEADINGS — it never lost them. It has rendered
 * `.nb-exgroup` + `.nb-exhead` since the original build's Phase 7. What actually changes here is
 * the ACTION: the drawer offered "Use as a starting point →", which SEEDED THE COMPOSER with an
 * editable draft and wrote nothing. v2's "Keep this" CREATES A REAL NOTE immediately. That
 * behaviour is not new to the app either — it is the board example papers' own, migrating to the
 * drawer as the papers are removed from the board.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask } from "../../types";
import { NOTE_EXAMPLES } from "./noteboardExamples";

const here = __dirname;
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));

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
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE, tags: [] },
    addUserTask: async () => undefined, updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

/**
 * ⚠️ THE DRAWER MOUNTS ONLY WHEN OPEN, so a closed render proves nothing about it. Static
 * rendering runs no effects and cannot click, so the drawer's own markup is read from SOURCE for
 * the cases about its contents — and the SHAPE is what those cases are about. The end-to-end
 * behaviour (click Keep this → a note appears, the drawer closes) is measured in the browser,
 * where a click is a click; see nbWorkflow.measure.ts.
 */
const drawerSource = (): string => {
  const at = page.indexOf("nb-drawer-body");
  expect(at, "no drawer body in the page source").toBeGreaterThan(-1);
  const end = page.indexOf("</aside>", at);
  expect(end, "the drawer's closing tag is missing").toBeGreaterThan(at);
  return page.slice(at, end);
};

afterEach(() => { seed.userTasks = []; });

describe("⚠️ (a) the board carries NO example papers, at any note count", () => {
  it("zero notes: the board container exists and holds nothing example-shaped", () => {
    const html = render();
    /* ⚠️ THE ANCHOR FIRST — a vacuous pass is the likely failure here. If the board never
       mounted, "no examples in the board" would be trivially true and prove nothing. */
    expect(html.indexOf("nb-board"), "no board container to look inside").toBeGreaterThan(-1);
    for (const dead of ["nb-example", "nb-exlabel", "nb-keep", "nb-exdismiss", "nb-exintro"]) {
      expect(html, dead).not.toMatch(new RegExp(`["\\s\`]${dead}["\\s\`]`));
    }
    expect(html).not.toContain("data-example");
  });

  it("the board-side machinery is GONE from the page, not merely unrendered", () => {
    for (const dead of ["sparseExamples", "examplePapers", "dismissExample", "keepExample"]) {
      expect(page, dead).not.toContain(dead);
    }
  });

  it("⚠️ the threshold and the sparse filter retire from the lib with it", () => {
    const lib = decls(readFileSync(join(here, "../../lib/noteboard.ts"), "utf8"));
    expect(lib).not.toContain("sparseExamples");
    expect(lib).not.toContain("NOTE_EXAMPLE_PAPERS");
    /* ⚠️ BUT THE PREFS STORE SURVIVES — `order` (drag-to-reorder) lives in the same sub-map, so
       `noteboardPrefs` is still read every render. Only the `dismissedExamples` KEY goes unused,
       and its data and rules are left alone deliberately (unattended run). */
    expect(lib).toContain("noteboardPrefs");
    expect(lib).toContain("order:");
  });
});

describe("⚠️ (b) the drawer's groups — one whole ordered sequence", () => {
  it("the group headings come from the module, in its order", () => {
    /* the sequence is the MODULE's — the drawer maps it, so one comparison covers both */
    const body = drawerSource();
    expect(body).toContain("NOTE_EXAMPLES.map");
    expect(body).toContain("{g.group}");
    const headings = NOTE_EXAMPLES.map((g) => g.group);
    /* the module is the authority for the words, and the ref carries the same six */
    expect(headings).toEqual([
      "Personalisation", "The letter & package", "Comps",
      "Reading the responses", "If the call comes", "While you wait",
    ]);
  });

  it("every example is inside a group — the nesting is structural, not incidental", () => {
    const body = drawerSource();
    /* the items map INSIDE the group map: one nesting, so no example can be loose */
    const groupAt = body.indexOf("NOTE_EXAMPLES.map");
    const itemAt = body.indexOf("g.items.map");
    expect(groupAt, "no group map").toBeGreaterThan(-1);
    expect(itemAt, "no item map").toBeGreaterThan(groupAt);
    expect(NOTE_EXAMPLES.length).toBe(6);
    expect(NOTE_EXAMPLES.reduce((n, g) => n + g.items.length, 0)).toBe(9);
  });
});

describe("⚠️ (c) Keep this CREATES — the drawer stopped offering a draft", () => {
  it("the action creates a real note through the normal path and closes the drawer", () => {
    const body = drawerSource();
    expect(body).toContain("Keep this");
    /* ⚠️ THE OLD ACTION IS GONE, NOT RELABELLED. "Use as a starting point →" seeded the composer
       (`setCompose(draftFromExample(ex))`) and wrote NOTHING; v2's Keep this writes immediately.
       Leaving both would give one example two doors with different consequences. */
    expect(body).not.toContain("Use as a starting point");
    expect(page).not.toContain("draftFromExample");

    const fn = page.slice(page.indexOf("const keepFromDrawer"));
    expect(page.indexOf("const keepFromDrawer"), "no keep handler").toBeGreaterThan(-1);
    const handler = fn.slice(0, fn.indexOf("\n  };"));
    expect(handler).toContain("addUserTask(");          // the normal create path
    expect(handler).toContain("setUserTaskColour");     // …and the paper follows, as it must
    expect(handler).toContain("setExamples(false)");    // the drawer closes
    expect(handler).toContain("Kept — it’s yours to edit now.");   // the existing receipt, unchanged
  });
});

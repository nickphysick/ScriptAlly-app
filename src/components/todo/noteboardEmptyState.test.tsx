/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the illustrated empty state (empty-state run, Phase 1;
 * ref design-refs/noteboard-empty-state.html).
 *
 * ⚠️ THE CONDITION IS ZERO NOTES, FULL STOP — and that is a DELIBERATE OVERRIDE of the inherited
 * one. `.nb-empty` used to render only when the board was empty AND every example had been
 * dismissed, because an earlier pass found the panel suppressing the papers entirely and made it
 * yield. Coexistence is what that fix was protecting; the workflow and the papers stack, exactly
 * as the ref draws them. Case (b) is the one the old condition got wrong and is asserted
 * explicitly.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask } from "../../types";
import { MAKE_TASK_LABEL } from "../../lib/todoMenu";
import { NOTEBOARD_STEPS, NOTEBOARD_OPENING, NOTEBOARD_BELOW } from "./noteboardEmptyState";

const here = __dirname;
/* ⚠️ THE LINE-COMMENT STRIP MUST NOT EAT A URL. `xmlns="http://www.w3.org/2000/svg"` contains
   `//`, so a naive strip truncated every SVG's opening tag — taking `role="img"` with it and
   reporting three correctly-labelled illustrations as zero. The lookbehind spares a scheme. */
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");

const seed: { userTasks: UserTask[]; dismissed?: string[] } = { userTasks: [] };
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
      todoPrefs: seed.dismissed ? { noteboard: { dismissedExamples: seed.dismissed } } : undefined },
    addUserTask: async () => undefined, updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (id: string, day: string): UserTask => ({
  id, userId: "u1", text: `note ${id}`, done: false,
  createdAt: `2026-08-${day}T09:00:00Z`, updatedAt: "",
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

/**
 * The page's SECTION KINDS in rendered order — one sequence, never per-section presence.
 * ⚠️ Anchored: the marker classes must be findable before their positions mean anything.
 */
const sections = (html: string): string => {
  const seq: Array<{ at: number; kind: string }> = [];
  /* ⚠️ THE EXACT CLASS TOKEN, NEVER A BOUNDARY MATCH. `\b` treats a hyphen as a boundary, so
     `nb-opening` matched inside `nb-opening-cta` and `nb-exhead` inside `nb-exhead-h` — the
     prefix trap this repo has been bitten by twice, wearing a regex. The class LIST is split and
     compared member by member. */
  const mark = (cls: string, kind: string) => {
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      if ((m[1] ?? "").split(/\s+/).includes(cls)) seq.push({ at: m.index ?? 0, kind });
    }
  };
  mark("nb-opening", "heading");
  mark("nb-steps", "steps");
  mark("nb-opening-cta", "cta");
  mark("nb-exintro", "examples-header");
  mark("nb-example", "example");
  return seq.sort((a, b) => a.at - b.at).map((s) => s.kind).join(" ");
};

/** The page's BLOCK kinds in rendered order — board, separator, and the workflow's own parts. */
const blocks = (html: string): string => {
  const seq: Array<{ at: number; kind: string }> = [];
  const mark = (cls: string, kind: string) => {
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      if ((m[1] ?? "").split(/\s+/).includes(cls)) seq.push({ at: m.index ?? 0, kind });
    }
  };
  /* ⚠️ THE EMPTY BOARD STILL MOUNTS (it holds the ghost), so its presence is not the signal —
     a NOTE inside it is. Marking the container unconditionally put a trailing "board" after the
     empty state's own sequence and made a correct page look wrong. */
  if (/class="[^"]*\bnb-note\b/.test(html)) mark("nb-board", "board");
  mark("nb-wf-sep", "separator");
  mark("nb-wf-h", "heading");
  mark("nb-wf-lede", "lede");
  mark("nb-wf-cta", "cta");
  mark("nb-steps", "steps");
  return seq.sort((a, b) => a.at - b.at).map((s) => s.kind).join(" ");
};

afterEach(() => { seed.userTasks = []; seed.dismissed = undefined; });

describe("⚠️ the arrangement — one ordered comparison, never per-section presence", () => {
  it("(a) zero notes: heading · steps · cta — and NOTHING example-shaped on the board", () => {
    /* ⚠️ SUPERSEDED (workflow run, Phase 1). This asserted the papers stacking beneath the
       workflow, which was the arrangement for exactly one day; v2 moves them to the drawer
       entirely, so the board carries the writer's notes and nothing else.
       ⚠️ THE ORDER WITHIN THE WORKFLOW REVERSES TOO — v2 puts the CTA between the lede and the
       panels, not after them. Phase 2 owns that; this case owns the absence. */
    const html = render();
    expect(html.indexOf("nb-board"), "no board container").toBeGreaterThan(-1);
    expect(sections(html)).not.toContain("example");
    expect(html).not.toContain("data-example");
  });

  it("(b) ⚠️ zero notes: the workflow renders and nothing example-shaped does", () => {
    /* ⚠️ THE DISMISSAL HALF IS RETIRED (workflow run, Phase 1) — there is no board-level
       dismissal any more, so the case that once distinguished "dismissed" from "not" collapses
       to the one claim that survives: the workflow stands, the board carries no examples. */
    const html = render();
    expect(blocks(html)).toBe("heading lede cta steps");
    expect(html).not.toMatch(/["\s`]nb-example["\s`]/);
  });

  it("(c) one note: no examples anywhere on the board", () => {
    /* ⚠️ AND THE WORKFLOW NO LONGER RETIRES HERE — v2 keeps it below the board at any note count,
       in its own second arrangement. Phase 2 asserts that; this case owns the examples' absence,
       which is unconditional now. */
    seed.userTasks = [note("a", "12")];
    const html = render();
    expect(html.indexOf("nb-board"), "no board to anchor on").toBeGreaterThan(-1);
    expect(sections(html)).not.toContain("example");
    expect(html).not.toContain("data-example");
  });

  it("(d) ⚠️ three notes: no examples — and the workflow is STILL THERE", () => {
    /* ⚠️ REVERSED (workflow run, Phase 2). This asserted the workflow retiring at three notes,
       which was v1's rule; v2's workflow never retires — it moves below the board instead. The
       examples' absence is what stays unconditional. */
    seed.userTasks = [note("a", "12"), note("b", "13"), note("c", "14")];
    const html = render();
    expect(html.indexOf("nb-board"), "no board to anchor on").toBeGreaterThan(-1);
    expect(blocks(html)).toBe("board separator heading lede steps");
    expect(html).not.toContain("data-example");
  });
});

describe("⚠️ TWO ARRANGEMENTS, ONE PANELS COMPONENT (workflow run, Phase 2)", () => {
  it("(a) zero notes: heading · lede · CTA · steps — the CTA sits BETWEEN lede and steps", () => {
    /* ⚠️ ONE ORDERED COMPARISON. The CTA's POSITION is the whole point of v2's first state — it
       moved above the panels — and a presence check cannot see order. */
    expect(blocks(render())).toBe("heading lede cta steps");
  });

  it("(b) one note: board · separator · heading · lede · steps, and NO CTA row", () => {
    seed.userTasks = [note("a", "12")];
    const html = render();
    expect(blocks(html)).toBe("board separator heading lede steps");
    /* the toolbar button and the ghost card already cover it; a third door would be one too many */
    expect(html, "a CTA row rendered beside a board that already has two doors")
      .not.toMatch(/["\s`]nb-wf-cta["\s`]/);
    expect(html).toContain("Write it down for later…");
    expect(html).toContain("How the board works");
  });

  it("…and the workflow NEVER retires — four notes still carry it", () => {
    seed.userTasks = ["12", "13", "14", "15"].map((d, i) => note(`n${i}`, d));
    expect(blocks(render())).toBe("board separator heading lede steps");
  });

  it("(e) ⚠️ both states mount the SAME panels component — never two divergent copies", () => {
    const empty = decls(readFileSync(join(here, "noteboardEmptyState.tsx"), "utf8"));
    /* one <NoteboardSteps/> definition, referenced by both arrangements — two copies would pass
       every other probe here and drift on the next edit */
    expect([...empty.matchAll(/const NoteboardSteps/g)]).toHaveLength(1);
    expect([...empty.matchAll(/<NoteboardSteps/g)].length).toBeGreaterThanOrEqual(2);
    /* and the panels' own data is one array, mapped once */
    expect([...empty.matchAll(/NOTEBOARD_STEPS\.map/g)]).toHaveLength(1);
    /* the rendered marker is identical in both states */
    const zero = render();
    seed.userTasks = [note("a", "12")];
    const withNote = render();
    for (const html of [zero, withNote]) expect(html).toContain('data-nb-steps="workflow"');
  });

  it("the second state's copy is the ref's own shortened lede", () => {
    const ref = readFileSync(join(here, "../../../design-refs/noteboard-empty-state-v2.html"), "utf8")
      .replace(/<[^>]+>/g, "");
    expect(ref).toContain(NOTEBOARD_BELOW.heading);
    expect(ref).toContain(NOTEBOARD_BELOW.lede);
    expect(ref).toContain(NOTEBOARD_BELOW.separator);
    /* shorter than the empty state's, which is what "shortened" means */
    expect(NOTEBOARD_BELOW.lede.length).toBeLessThan(NOTEBOARD_OPENING.body.length);
  });
});

describe("⚠️ the copy is the ref's, and panel three reads the KEBAB'S constant", () => {
  it("(f) panel three's heading IS the extracted label — not a literal beside it", () => {
    /* ⚠️ THE SAME CONSTANT, imported from the module the kebab renders from. A duplicated string
       would agree today and drift the first time either surface is reworded. */
    expect(NOTEBOARD_STEPS[2].heading).toBe(MAKE_TASK_LABEL);
    /* the kebab opens a popover and says so with an ellipsis; a HEADING is not an opener */
    expect(MAKE_TASK_LABEL).toBe("Turn into a task");
    expect(render()).toContain(MAKE_TASK_LABEL);
  });

  it("the retirement lock is untouched — 'Give it a date' stays retired", () => {
    /* the ref's own panel-three heading is "Give it a date, if it needs one", and it does NOT
       ship: the phrase and the `give-date` menu id were retired together and that is locked. */
    const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
    expect(page).not.toContain("give-date");
    expect(page).not.toContain("Give it a date");
    const menu = decls(readFileSync(join(here, "../../lib/todoMenu.ts"), "utf8"));
    expect(menu).not.toContain("give-date");
  });

  it("three panels, the ref's order, each with heading · body · aside · an SVG", () => {
    expect(NOTEBOARD_STEPS).toHaveLength(3);
    expect(NOTEBOARD_STEPS.map((s) => s.n)).toEqual(["One", "Two", "Three"]);
    expect(NOTEBOARD_STEPS[0].heading).toBe("Write it down");
    expect(NOTEBOARD_STEPS[1].heading).toBe("Colour and tag it");
    for (const s of NOTEBOARD_STEPS) {
      expect(s.body.length, s.heading).toBeGreaterThan(20);
      expect(s.aside.length, s.heading).toBeGreaterThan(10);
    }
    /* the ref is the authority for the words — every panel's body and aside appear in it */
    /* ⚠️ TAGS STRIPPED BEFORE COMPARING. Panel two's sentence is split by a styled `<span>`
       around `#agents` in the ref, so the contiguous string exists only once the markup is gone —
       comparing raw would report a verbatim port as a drift. */
    const ref = readFileSync(join(here, "../../../design-refs/noteboard-empty-state.html"), "utf8")
      .replace(/<[^>]+>/g, "");
    for (const s of NOTEBOARD_STEPS) {
      expect(ref, `${s.heading} body`).toContain(s.body);
      expect(ref, `${s.heading} aside`).toContain(s.aside);
    }
    expect(ref).toContain(NOTEBOARD_OPENING.heading);
    expect(ref).toContain(NOTEBOARD_OPENING.body);
  });

  it("⚠️ the illustrations are FLAT — no gradient, filter or shadow anywhere in the SVGs", () => {
    const art = decls(readFileSync(join(here, "noteboardEmptyArt.tsx"), "utf8"));
    for (const banned of ["Gradient", "gradient", "filter", "feGaussian", "drop-shadow", "opacity=\"0"]) {
      expect(art, banned).not.toContain(banned);
    }
    /* each carries role="img" and its own label, per the ref */
    expect([...art.matchAll(/role="img"/g)]).toHaveLength(3);
    expect([...art.matchAll(/aria-label=/g)]).toHaveLength(3);
    /* and no theming: baked fills only, like manuscriptMarks */
    expect(art).not.toContain("currentColor");
    expect(art).not.toContain("var(--");
  });
});

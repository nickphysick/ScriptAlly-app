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
import { NOTEBOARD_STEPS, NOTEBOARD_OPENING, NOTEBOARD_EXHEAD } from "./noteboardEmptyState";

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

afterEach(() => { seed.userTasks = []; seed.dismissed = undefined; });

describe("⚠️ the arrangement — one ordered comparison, never per-section presence", () => {
  it("(a) zero notes, nothing dismissed: heading · steps · cta · examples-header · examples×3", () => {
    expect(sections(render()))
      .toBe("heading steps cta examples-header example example example");
  });

  it("(b) ⚠️ zero notes, ALL examples dismissed: the workflow STILL renders and no example does", () => {
    /* the case the inherited condition got wrong — `.nb-empty` rendered ONLY when every example
       was dismissed, which is precisely backwards: the workflow is what an empty board owes the
       reader whether or not the papers are still on offer */
    seed.dismissed = ["ex-yellow", "ex-pink", "ex-sage"];
    const html = render();
    expect(sections(html)).toBe("heading steps cta");
    expect(html).not.toMatch(/["\s`]nb-example["\s`]/);
    expect(html).not.toMatch(/["\s`]nb-exintro["\s`]/);
  });

  it("(c) one note: no workflow, examples still there", () => {
    seed.userTasks = [note("a", "12")];
    const html = render();
    expect(html.indexOf("nb-board"), "no board to anchor on").toBeGreaterThan(-1);
    expect(sections(html)).toBe("examples-header example example example");
    for (const dead of ["nb-opening", "nb-steps", "nb-opening-cta"]) {
      expect(html, dead).not.toMatch(new RegExp(`["\\s\`]${dead}["\\s\`]`));
    }
  });

  it("(d) three notes: neither workflow nor examples", () => {
    seed.userTasks = [note("a", "12"), note("b", "13"), note("c", "14")];
    const html = render();
    expect(html.indexOf("nb-board"), "no board to anchor on").toBeGreaterThan(-1);
    expect(sections(html)).toBe("");
  });
});

describe("⚠️ ONE composer, three entry points — one code path, never a second component", () => {
  it("the CTA takes an opener as a PROP; it does not know how to open anything itself", () => {
    /* ⚠️ THE STRUCTURAL HALF of the identity claim the browser probe measures. The empty state
       cannot mount a composer even by mistake: it holds no composer state, imports no composer,
       and calls whatever `onPin` it is given — which the page wires to the SAME `openComposer`
       the toolbar button and the ghost tile call. A lookalike second composer would pass a
       presence check; it cannot exist at all if the component has no way to build one. */
    const empty = decls(readFileSync(join(here, "noteboardEmptyState.tsx"), "utf8"));
    expect(empty).toContain("onPin: () => void");
    expect(empty).toContain("onClick={onPin}");
    for (const forbidden of ["useState", "nb-compose", "textarea", "setCompose"]) {
      expect(empty, forbidden).not.toContain(forbidden);
    }
    /* and the page hands all three doors the same function */
    const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
    expect(page).toContain("onPin={() => openComposer()}");
    expect([...page.matchAll(/openComposer\(\)/g)].length).toBeGreaterThanOrEqual(3);
    expect([...page.matchAll(/["\s`]nb-compose["\s`]/g)].length).toBe(1);   // one composer node
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
    expect(ref).toContain(NOTEBOARD_EXHEAD.heading);
    expect(ref).toContain(NOTEBOARD_EXHEAD.body);
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

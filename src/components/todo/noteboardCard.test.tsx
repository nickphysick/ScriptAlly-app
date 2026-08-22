/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the board and the note card (build Phase 3; ref design-refs/noteboard-mockup.html).
 *
 * ⚠️ THE CARD IS ONE BODY NOW, NOT A TITLE AND A DETAIL. The mockup's note is a single pre-wrap
 * block in Caveat: a writer's note has line breaks and bullets in it, not a headline. `detail`
 * still renders when a note carries one, because notes written under the old split have prose in
 * it and dropping it would lose their words — but nothing writes it any more.
 *
 * ⚠️ AND THE ORDER OF THE FOOT IS ASSERTED ON THE COMPOSED CARD, never child by child. Querying
 * three elements separately cannot detect that they rendered as one collapsed run — the fault
 * that put "TextIn 1 package" on the packages band through eleven passing assertions. Order,
 * adjacency and containment exist only in the arrangement, so the probe reads the arrangement.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, UserTask } from "../../types";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const css = decls(readFileSync(join(here, "todoNoteboard.css"), "utf8"));

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
    deleteUserTask: async () => undefined, setUserTaskColour: async () => true,
    upsertTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
  }),
}));

import { TodoNoteboardPage } from "./TodoNoteboardPage";

const note = (over: Partial<UserTask>): UserTask => ({
  id: "n1", userId: "u1", text: "A note", done: false,
  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z", ...over,
});
const render = () =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo/noteboard"]}><TodoNoteboardPage onNavigate={() => {}} /></MemoryRouter>);

/** The card's own HTML — sliced on an asserted anchor, never on a marker that might be absent. */
const cardOf = (html: string, id: string) => {
  const open = html.indexOf(`data-note="${id}"`);
  expect(open, `no card for ${id}`).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<article", open);
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf("</article>", open);
  expect(end).toBeGreaterThan(-1);
  return html.slice(start, end);
};

afterEach(() => { seed.userTasks = []; });

describe("⚠️ one body, and the writer's line breaks survive it", () => {
  it("the note renders as a single pre-wrap block, not a title over a detail", () => {
    seed.userTasks = [note({ id: "a", text: "Synopsis rules:\n• present tense\n• one page" })];
    const card = cardOf(render(), "a");
    expect(card).toContain("nb-body");
    /* the old split is gone from the card — bounded tokens, never substrings */
    for (const dead of ["nb-nt", "nb-nb"]) {
      expect(card, dead).not.toMatch(new RegExp(`["\\s\`]${dead}["\\s\`]`));
    }
    /* and the sheet keeps the breaks the writer typed */
    expect(css).toMatch(/\.nb-body\s*\{[^}]*white-space:\s*pre-wrap/);
    expect(css).toMatch(/\.nb-body\s*\{[^}]*font-family:\s*"Caveat"/);
  });

  it("a legacy note's detail still shows — nothing writes it, nothing loses it either", () => {
    seed.userTasks = [note({ id: "a", text: "Top line", detail: "the second line from the old split" })];
    expect(cardOf(render(), "a")).toContain("the second line from the old split");
  });
});

describe("⚠️ the foot is ONE run, and its order is a property of the arrangement", () => {
  it("tag, then date, then the ⋯ — read off the composed card, not three separate queries", () => {
    seed.userTasks = [note({ id: "a", tags: ["t1"] })];
    const card = cardOf(render(), "a");
    const at = (cls: string) => {
      const i = card.indexOf(cls);
      expect(i, cls).toBeGreaterThan(-1);   // the anchor, before it is used as a position
      return i;
    };
    expect(at("nb-tag")).toBeLessThan(at("nb-date"));
    expect(at("nb-date")).toBeLessThan(at("tbd-more"));
    /* the ⋯ sits IN the foot now, in flow, where the mockup draws it — so the page overrides the
       board's absolutely-positioned seat rather than leaving a control hanging over the body */
    expect(card.indexOf("nb-foot")).toBeLessThan(at("tbd-more"));
    expect(css).toMatch(/\.nb-note\s+\.tbd-more\s*\{[^}]*position:\s*static/);
  });

  it("the date is always there; the tag only when the note has one", () => {
    seed.userTasks = [note({ id: "a" })];
    const bare = cardOf(render(), "a");
    expect(bare).toContain("nb-date");
    expect(bare).not.toContain("nb-tag");   // absence renders nothing, never an empty pill
  });
});

describe("⚠️ the paper rules come AFTER .nb-note — source order decides this", () => {
  it("a paper's border-color is declared later than the border it must beat", () => {
    /* ⚠️ MEASURED, THEN LOCKED. `.nb-note` and `.nb-c-*` land on the SAME element at the SAME
       specificity (0-1-0), so the later rule wins. Declared above it, every `border-color` lost
       to `.nb-note { border: 1px solid transparent }` and all three papers rendered with an
       invisible border — in a sheet where each rule reads correctly on its own, through a lock
       that asserted these very declarations exist. The computed value is what found it
       (noteboardLook.measure.ts); this keeps it from coming back. */
    const note = css.indexOf(".nb-note {");
    expect(note, "no .nb-note rule").toBeGreaterThan(-1);
    for (const paper of [".nb-c-yellow", ".nb-c-pink", ".nb-c-sage"]) {
      const at = css.indexOf(paper);
      expect(at, paper).toBeGreaterThan(-1);
      expect(at, `${paper} must be declared AFTER .nb-note or its border-color is discarded`).toBeGreaterThan(note);
    }
  });
});

describe("⚠️ hover is a SHADOW, never a lift", () => {
  it("the card has a hover shadow and no transform anywhere near it", () => {
    /* a lift pushes the top edge past a clipping boundary and reads as the hairline vanishing —
       the fault that was fixed on .msv-spine once and reinstated by a revision that predated it */
    expect(css).toMatch(/\.nb-note:hover\s*\{[^}]*box-shadow/);
    const noteRule = css.slice(css.indexOf(".nb-note {"));
    expect(css.indexOf(".nb-note {")).toBeGreaterThan(-1);
    expect(noteRule.slice(0, 400)).not.toContain("transform");
    expect(css).not.toMatch(/\.nb-note:hover\s*\{[^}]*transform/);
    expect(css).not.toMatch(/\.nb-note[^{]*\{[^}]*translateY/);
  });

  it("⚠️ nothing on this board uses display:contents or a blend layer", () => {
    expect(css).not.toContain("display: contents");
    expect(css).not.toContain("mix-blend-mode");
  });
});

describe("⚠️ the flow is masonry, and the column view is a reading measure", () => {
  it("CSS columns pack by length — never a stretched grid", () => {
    /* ⚠️ THE COUNT IS DERIVED FROM THE VIEWPORT NOW (finish run, 1a): `column-width`, never a
       fixed `column-count` — the mockup's three was drawn against a 1240px card and gave 505px
       notes at 1920 on the real page. The mechanism claim is unchanged: multicol, never grid. */
    expect(css).toMatch(/\.nb-board\s*\{[^}]*column-width:\s*280px/);
    expect(css).not.toMatch(/\.nb-board\s*\{[^}]*column-count/);
    expect(css).not.toMatch(/\.nb-board\s*\{[^}]*columns:\s*\d/);
    expect(css).toMatch(/\.nb-note\s*\{[^}]*break-inside:\s*avoid/);
    expect(css).not.toMatch(/\.nb-board[^}]*display:\s*grid/);
  });

  it("six notes of six lengths render six cards, each carrying its own words", () => {
    /* distinct inputs, distinct outputs — six identical seeds would collapse to one value and
       prove nothing about the rendering */
    const bodies = ["One", "Two lines here", "A third, longer\nwith a break",
      "Four", "A fifth note that runs on a good deal further than the others do", "Six"];
    seed.userTasks = bodies.map((text, i) => note({ id: `n${i}`, text }));
    const html = render();
    for (const [i, b] of bodies.entries()) expect(cardOf(html, `n${i}`)).toContain(b.split("\n")[0]);
    expect(new Set(bodies).size).toBe(6);
  });
});

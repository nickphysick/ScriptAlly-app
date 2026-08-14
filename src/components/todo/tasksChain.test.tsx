/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TRIPWIRE FOR A SCROLLER THAT CANNOT SCROLL (scroll fix, 9 August 2026).
 *
 * THE BUG THIS EXISTS FOR. `.tpl-zone` is the one designated scroller on a Tasks page, and it
 * earns that by being a flex item with `flex: 1; min-height: 0` inside a bounded flex column. Two
 * wrappers sat between it and `.tpl-body` — `.tdb-centre` at the default `min-height: auto`, and
 * `.tdb-board`, a plain BLOCK. A block parent means the zone is not a flex item at all, so its
 * `flex: 1` did nothing, it resolved to its content height, and `overflow: auto` never engaged.
 * `.tdb-wrap`'s viewport lock then clipped the surplus. Browser-measured at 1440×900: the zone
 * was 2576px tall with `scrollHeight === clientHeight`, and 2,099px of list was unreachable.
 *
 * ⚠️ WHY THE OLD LOCK PASSED THROUGH IT, WHICH IS THE POINT. The viewport lock asserted that the
 * PAGE does not scroll — and CLIPPING satisfies that exactly as well as a working scroller does.
 * The board masked the rest: it capped each column at eight cards, so its content fitted the
 * frame and the dead links never showed. The consolidated list renders every group in full and
 * hit the ceiling immediately. A test that measures the absence of the wrong thing is worse than
 * no test, because it is believed.
 *
 * ⚠️ WHAT THIS FILE CAN AND CANNOT DO, STATED PLAINLY. The assertion one actually wants is
 * `scrollHeight > clientHeight` on the zone with an overflowing fixture. **It is not possible in
 * this repo, and adding jsdom would not make it possible** — jsdom has no layout engine and
 * returns 0 for every scroll/client dimension. A real browser (Playwright and friends) is a
 * tooling decision across 216 test files, not a bug fix. So the measured check goes on the manual
 * browser checklist in reports/tasks-consolidation-p3-p4.md, with the exact snippet to paste, and
 * what is automated here is the STRUCTURE that made the zone stop scrolling: every element between
 * `.tpl-body` and `.tpl-zone` in the RENDERED page must be an enumerated chain link.
 *
 * That is not a restatement of the CSS lock beside it. That one reads the stylesheet and asks
 * "does each named link declare its part"; this one reads the real markup and asks "is there
 * anything in the chain nobody named". `.tdb-board` was invisible to the first question and is
 * exactly what the second catches.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan } from "../../types";

const here = __dirname;

/* A populated page: the first-run panel renders no zone at all, so an empty mock would prove
   nothing. One agent gets the page past its own front door; one dated task fills the list. */
const today = new Date();
const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    /* ⚠️ THE READINESS FLAG IS PART OF THE CONTRACT NOW (P5): the page renders its loading
       shell until the db's first snapshot lands, so a mock that omits this renders a
       skeleton and every content assertion below it fails for the wrong reason. */
    collectionsReady: true,
    tasks: [], queries: [], manuscripts: [], packages: [], versions: [], activities: [],
    taskFlags: [], notes: [], dismissedTasks: [],
    agents: [{ id: "a1", userId: "u1", name: "Tom Ellery", agency: "Ellery & Frost" }],
    userTasks: [{ id: "t1", userId: "u1", text: "Redraft the opening chapter", done: false, dueDate: ymd, createdAt: "", updatedAt: "" }],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    addUserTask: async () => undefined,
    updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined,
    updateUserProfile: async () => undefined,
  }),
}));

import { ToDoPage } from "./ToDoPage";

/* ── the walker ─────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ A TAG STACK, NOT A REGEX OVER NESTING. Counting opening tags with a pattern is how brace
 * miscounts happen; this walks the markup once, keeping a stack, and returns the open elements'
 * classes at the moment a given class opens. The input is our OWN `renderToStaticMarkup` output —
 * well-formed, no implied closes — which is what makes a small parser honest here rather than a
 * shortcut. Self-tested below against a fixture that contains the bug.
 */
export function ancestorClasses(html: string, targetClass: string): string[] | null {
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const stack: string[][] = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const [, closing, name, attrs, selfClose] = m;
    if (closing) { stack.pop(); continue; }
    const classes = (attrs.match(/\sclass="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
    if (VOID.has(name.toLowerCase()) || selfClose) continue;
    if (classes.includes(targetClass)) return stack.flat();
    stack.push(classes);
  }
  return null;
}

/* ⚠️ EVERY LINK, NAMED. This list is the same one the chain comment in tasksLayout.css carries;
   an element in the rendered chain whose classes are all absent from it fails the case below.
   Adding a wrapper is therefore a deliberate act with a name attached, which is precisely what
   `.tdb-board` never was. */
const CHAIN = [
  "sa-content-col", // StagePage's optional cap column (no Tasks slot uses it today)
  "t-f12", "spine-root", "tdb-wrap", "today-off", "tdb-col", "tpl",
  "tpl-cols", "tpl-body", "tdb-centre",
  /* ⚠️ THE TWO THE SPLIT ADDED (rail + workspace, Phase 2), named here because that is the price
     of adding them. `.tdw-split` is the grid and `.tdw-rail` is its left pane; the zone is now a
     grandchild of `.tdb-centre` rather than a child. Both declare `min-height: 0` — asserted in
     tasksViewport.test.tsx, where the rest of the chain is pinned — and this list is what stops a
     THIRD wrapper arriving unnoticed between them, which is exactly what `.tdb-board` was. */
  "tdw-split", "tdw-rail",
];

describe("⚠️ NOTHING UNNAMED MAY SIT BETWEEN `.tpl-body` AND THE SCROLLER", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/todo"]}><ToDoPage onNavigate={() => {}} /></MemoryRouter>,
  );

  it("the populated page renders a zone at all (or this case proves nothing)", () => {
    expect(html).toContain("tpl-zone");
    expect(html).toContain("tdg-panel"); // …with real rows in it
  });

  it("every element above the zone is an enumerated chain link", () => {
    const above = ancestorClasses(html, "tpl-zone");
    expect(above, "the zone must be in the rendered page").not.toBeNull();
    const start = above!.indexOf("tpl-body");
    expect(start, "`.tpl-body` must be an ancestor of the zone").toBeGreaterThan(-1);
    /* everything from .tpl-body down to the zone — the segment where a stray block is fatal */
    const between = above!.slice(start);
    for (const cls of between) {
      expect(CHAIN, `\`.${cls}\` sits in the scroll chain and is not an enumerated link`).toContain(cls);
    }
  });

  it("⚠️ AND THE FIXTURE PROVES THE TRIPWIRE TRIPS — the pre-fix markup fails it", () => {
    /* The exact shape that shipped: a bare `.tdb-board` block wrapping the zone. If this passed,
       the case above would be decoration. */
    const broken = '<div class="tpl-body"><div class="tdb-centre"><div class="tdb-board"><div class="tpl-zone">x</div></div></div></div>';
    const above = ancestorClasses(broken, "tpl-zone")!;
    expect(above).toContain("tdb-board");
    expect(CHAIN).not.toContain("tdb-board");

    const fixed = '<div class="tpl-body"><div class="tdb-centre"><div class="tpl-zone">x</div></div></div>';
    for (const cls of ancestorClasses(fixed, "tpl-zone")!) expect(CHAIN).toContain(cls);
  });

  it("the walker itself: siblings are not ancestors, and void elements do not unbalance it", () => {
    const h = '<div class="a"><img src="x"><br><span class="sib">s</span><div class="b"><p class="target">t</p></div></div>';
    expect(ancestorClasses(h, "target")).toEqual(["a", "b"]);
    expect(ancestorClasses(h, "nope")).toBeNull();
  });
});

describe("⚠️ THE SCROLLER IS A FLEX ITEM OF A FLEX COLUMN — the half `.tdb-board` broke", () => {
  const css = readFileSync(join(here, "tasksLayout.css"), "utf8");
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  const rule = (sheet: string, sel: string): string => {
    const i = sheet.indexOf(sel);
    expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
    return sheet.slice(i, sheet.indexOf("}", i)).replace(/\/\*[\s\S]*?\*\//g, "");
  };

  it("the zone's PARENT declares a flex column — `flex: 1` on a block child does nothing", () => {
    const centre = rule(pageCss, ".tdb-centre {");
    expect(centre).toContain("display: flex");
    expect(centre).toContain("flex-direction: column");
    expect(centre).toContain("min-height: 0");
  });

  it("`.tdb-board` is EXTINCT — rule and div both, not merely unstyled", () => {
    const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    expect(pageCss).not.toContain(".tdb-board {");
    expect(page).not.toContain('className="tdb-board"');
  });

  it("the chain comment names `.tdb-centre`, so the list and the markup agree", () => {
    expect(css).toContain(".tdb-centre  →  .tpl-zone (the scroller)");
  });
});

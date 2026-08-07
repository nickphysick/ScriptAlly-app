/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The page sidebar, refined (board-optimise pack, Phase 2; ref design-refs/board-optimised.html
 * §1 — the `.pside` panel).
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TagDef } from "../../types";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], currentUser: { id: "u1", tags: [] },
    updateUserProfile: async () => undefined, updateUserTask: async () => undefined,
  }),
}));

import { TodoSideContainer } from "./TodoSideContainer";

const here = __dirname;
const css = readFileSync(join(here, "todoSide.css"), "utf8");
const src = readFileSync(join(here, "TodoSideContainer.tsx"), "utf8");
const hook = readFileSync(join(here, "useTagWrites.ts"), "utf8");
const rule = (sel: string) => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

const TAGS: TagDef[] = [
  { id: "t1", label: "queryletter", colour: "pink" },
  { id: "t2", label: "synopsis", colour: "sage" },
];
const COUNTS = { all: 16, urgent: 3, housekeeping: 11, yours: 2 } as const;

const render = (over: Partial<React.ComponentProps<typeof TodoSideContainer>> = {}) =>
  renderToStaticMarkup(
    <TodoSideContainer
      counts={COUNTS}
      active="all"
      onSelect={() => {}}
      onOpenTaskSettings={() => {}}
      onNoteboard={() => {}}
      tags={TAGS}
      tagCounts={new Map([["t1", 4], ["t2", 1]])}
      selectedTags={[]}
      onToggleTag={() => {}}
      onClearAll={() => {}}
      onCreateTag={() => {}}
      {...over}
    />,
  );

describe("⚠️ the active row carries an INK INSET BAR beside its fill", () => {
  it("the .on rule adds the 2px ink edge to the parchment fill", () => {
    const on = rule(".tds-row.on {");
    expect(on).toContain("background: var(--shell-parch)");
    expect(on).toContain("inset 2px 0 0 var(--shell-ink)");
  });

  it("a focused active row keeps its bar — the focus ring STACKS rather than replacing it", () => {
    const focused = rule(".tds-row.on:focus-visible {");
    expect(focused).toContain("var(--shell-focus)");
    expect(focused).toContain("inset 2px 0 0 var(--shell-ink)");
  });

  it("the bar renders on the active facet only", () => {
    const html = render({ active: "urgent" });
    expect((html.match(/tds-row on/g) ?? []).length).toBe(1);
  });
});

describe("⚠️ CLEAR sits beside FILTERS, appears only when something narrows, and resets BOTH", () => {
  it("absent at rest — nothing to clear, so nothing offers to", () => {
    expect(render()).not.toContain("tds-tagclear");
  });

  it("present when a FACET narrows…", () => {
    const html = render({ active: "urgent" });
    expect(html).toContain("tds-tagclear");
    // …and it sits in the FILTERS cap, not the TAGS one
    const filtersCap = html.slice(html.indexOf("Filters"), html.indexOf("Tags"));
    expect(filtersCap).toContain("tds-tagclear");
  });

  it("…and when a TAG narrows, with no second clear on the TAGS heading", () => {
    const html = render({ selectedTags: ["t1"] });
    expect((html.match(/tds-tagclear/g) ?? []).length).toBe(1);
    const tagsCap = html.slice(html.indexOf(">Tags<"));
    expect(tagsCap).not.toContain("tds-tagclear");
  });

  it("⚠️ it resets BOTH narrowings — every page hands it a facet reset AND a tag reset", () => {
    expect(src).toContain("const narrowed = active !== \"all\" || selectedTags.length > 0;");
    for (const page of ["ToDoPage.tsx", "TodoTodayPage.tsx", "TodoCalendarPage.tsx"]) {
      const p = readFileSync(join(here, page), "utf8");
      expect(p, page).toContain('onClearAll={() => { setFacet("all"); setTagSel([]); }}');
      expect(p, page).not.toContain("onClearTags=");
    }
  });
});

describe("⚠️ TAGS: the live list, plus an inline ＋ New tag opening the PICKER's create path", () => {
  it("rows carry their counts; the new-tag row renders beneath them", () => {
    const html = render();
    expect(html).toContain("#queryletter");
    expect(html).toContain(">4<");
    expect(html).toContain("New tag");
    expect(html.indexOf("New tag")).toBeGreaterThan(html.indexOf("#synopsis"));
  });

  it("the row opens the ONE TagPicker — never a second create field with its own rules", () => {
    expect(src).toContain("<TagPicker");
    expect(src).toContain("onCreate={(tag) => { onCreateTag(tag); setCreating(false); }}");
    // no bespoke input lives in this component
    expect(src).not.toContain("normaliseTagLabel");
  });

  it("⚠️ the create WRITE has one home — useTagWrites, shared by all four Tasks pages", () => {
    expect(hook).toContain("updateUserProfile({ tags: [...(currentUser?.tags ?? []), tag] })");
    for (const page of ["ToDoPage.tsx", "TodoTodayPage.tsx", "TodoCalendarPage.tsx", "TodoNoteboardPage.tsx"]) {
      const p = readFileSync(join(here, page), "utf8");
      expect(p, page).toContain("useTagWrites(flash)");
      // the per-page copies are gone
      expect(p, page).not.toContain("const createTagDef = async (tag: TagDef)");
    }
  });

  it("the new-tag row is absent when the page supplies no create path", () => {
    expect(render({ onCreateTag: undefined })).not.toContain("New tag");
  });
});

describe("⚠️ Task settings is pinned at the foot above a hairline", () => {
  it("the foot rule carries the rule line and the auto top margin that pins it", () => {
    const foot = rule(".tds-foot {");
    expect(foot).toContain("border-top: 1px solid");
    expect(foot).toContain("margin-top: auto");
  });

  it("it is the LAST control in the panel", () => {
    const html = render();
    expect(html.lastIndexOf("Task settings")).toBeGreaterThan(html.lastIndexOf("New tag"));
    expect(html.indexOf("tds-grow")).toBeLessThan(html.indexOf("Task settings"));
  });
});

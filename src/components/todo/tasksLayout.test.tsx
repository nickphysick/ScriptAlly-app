/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The alignment contract (tasks-pages pack, Phase 1; ref design-refs/tasks-pages.html).
 *
 * ⚠️ THE CONTRACT IS STRUCTURAL, NOT MAINTAINED: every Tasks page title sits at the same offset
 * because every page renders ONE TasksPageLayout wearing ONE geometry class carrying ONE top
 * token — not because four pages keep four numbers in step. These locks assert the structure:
 * the single component, the single token, the header→hairline→columns order, and the tool row
 * as the only control home. Today's squash was exactly this structure missing from that page.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TasksPageLayout, TplGrow } from "./TasksPageLayout";

const here = __dirname;
const layoutSrc = readFileSync(join(here, "TasksPageLayout.tsx"), "utf8");
const layoutCss = readFileSync(join(here, "tasksLayout.css"), "utf8");
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const todayPage = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");

const render = (sidebar?: React.ReactNode) =>
  renderToStaticMarkup(
    <TasksPageLayout
      title="Fixture page"
      subtitle="One line about it"
      tools={<><span data-t="tool-a" /><TplGrow /><button type="button" data-t="pink">＋ Make</button></>}
      sidebar={sidebar}
    >
      <div data-t="body">the body</div>
    </TasksPageLayout>,
  );

describe("⚠️ one token, one geometry — equal title offsets by construction", () => {
  it("the layout WEARS .tdb-col, the single geometry owner carrying --tdb-chrome-gap", () => {
    expect(layoutSrc).toContain('className="tdb-col tpl"');
  });

  it("⚠️ the layout's own stylesheet restates NO top padding — a second number is the squash reborn", () => {
    expect(layoutCss).not.toMatch(/\.tpl[^{]*\{[^}]*padding-top/);
    expect(layoutCss).not.toMatch(/\.tpl(\s|,)[^{]*\{[^}]*padding:/);
    expect(layoutCss).toContain("--tdb-chrome-gap"); // named in the warning, so the tie is stated
  });

  it("both live pages stand on the SAME component", () => {
    expect(listPage).toContain("<TasksPageLayout");
    expect(listPage).toContain('from "./TasksPageLayout"');
    expect(todayPage).toContain("<TasksPageLayout");
    expect(todayPage).toContain('from "./TasksPageLayout"');
    // and neither IMPORTS the retired header any more (supersession comments may still name it)
    expect(listPage).not.toContain('from "../shell/PageHeader"');
    expect(todayPage).not.toContain('from "../shell/PageHeader"');
  });
});

describe("⚠️ the order: header block → hairline → sidebar and body on the same line", () => {
  const html = render(<nav data-t="side">the sidebar</nav>);

  it("title → subtitle → tool row, spanning the full content width, then the columns", () => {
    const title = html.indexOf("Fixture page");
    const sub = html.indexOf("One line about it");
    const tools = html.indexOf("tpl-tools");
    const cols = html.indexOf("tpl-cols");
    const side = html.indexOf('data-t="side"');
    const body = html.indexOf('data-t="body"');
    expect(title).toBeGreaterThan(-1);
    expect(sub).toBeGreaterThan(title);
    expect(tools).toBeGreaterThan(sub);
    expect(cols).toBeGreaterThan(tools);   // the columns begin only after the header block ends
    expect(side).toBeGreaterThan(cols);    // the sidebar is INSIDE the columns row —
    expect(body).toBeGreaterThan(side);    // — beside the body, never beside the title
    // the header block is not inside the columns row
    expect(html.slice(cols)).not.toContain("tpl-title");
  });

  it("the hairline is the tool row's own bottom edge", () => {
    const i = layoutCss.indexOf(".tpl-tools {");
    const rule = layoutCss.slice(i, layoutCss.indexOf("}", i));
    expect(rule).toContain("border-bottom: 1px solid");
  });

  it("the sidebar is OPTIONAL — absent means no aside at all, never an empty gutter", () => {
    const bare = render(undefined);
    expect(bare).not.toContain("<aside");
    expect(bare).toContain('data-t="body"');
  });
});

describe("⚠️ the tool row is the ONLY home for page controls", () => {
  it("the board page's instruments live in renderTools, and nowhere else", () => {
    const tools = listPage.slice(listPage.indexOf("function renderTools"), listPage.indexOf("function renderHero"));
    for (const cls of ["tdb-bsearch", "tdb-sortb", "tdb-addb"]) {
      expect(tools, cls).toContain(cls);
      const outside = listPage.replace(tools, "");
      expect(outside.includes(`className="${cls}"`), `${cls} outside the tool row`).toBe(false);
    }
    expect(listPage).toContain("tools={renderTools()}");
  });

  it("Today's two controls live in its tools prop — the pink creation action in the right slot", () => {
    const tools = todayPage.slice(todayPage.indexOf("tools={"), todayPage.indexOf("sidebar={"));
    expect(tools).toContain("Work the list");
    expect(tools).toContain("Add to today");
    expect(tools).toContain("<TplGrow />");
    // the pink (tdb-addb) sits AFTER the grow — the right slot
    expect(tools.indexOf("tdb-addb")).toBeGreaterThan(tools.indexOf("<TplGrow />"));
    // and no button renders outside the tools/sidebar props before the body
    const afterTools = todayPage.slice(todayPage.indexOf("</TasksPageLayout>"));
    expect(afterTools).not.toContain("tdb-addb");
  });

  it("the sidebar prop carries the ONE TodoSideContainer on both pages", () => {
    for (const [name, src] of [["list", listPage], ["today", todayPage]] as const) {
      expect(src.indexOf("sidebar={"), name).toBeGreaterThan(-1); // the anchor (the slice law)
      const sidebar = src.slice(src.indexOf("sidebar={"), src.indexOf("sidebar={") + 900);
      expect(sidebar, name).toContain("<TodoSideContainer");
    }
  });
});

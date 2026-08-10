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
const calendarPage = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
const noteboardPage = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
const app = readFileSync(join(here, "..", "..", "App.tsx"), "utf8");

const render = (sidebar?: React.ReactNode) =>
  renderToStaticMarkup(
    <TasksPageLayout
      mark="todo"
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

  it("ALL THREE pages stand on the SAME component", () => {
    /* Three since 9 Aug (tasks-consolidation P1) — Today is retired. The contract is unchanged:
       every Tasks page wears the one layout, which is what makes their top edges agree. */
    for (const [name, src] of [["list", listPage], ["calendar", calendarPage], ["noteboard", noteboardPage]] as const) {
      expect(src, name).toContain("<TasksPageLayout");
      expect(src, name).toContain('from "./TasksPageLayout"');
    }
    // and it does not IMPORT the retired header any more (supersession comments may still name it)
    expect(listPage).not.toContain('from "../shell/PageHeader"');
  });
});

/* ── the HORIZONTAL half (tasks-audit addendum) ────────────────────────────────────────────── */

describe("⚠️ one gutter, one cap — equal LEFT offsets by construction", () => {
  it("⚠️ the layout's stylesheet restates NO horizontal padding — the gutter is .tdb-col's token", () => {
    expect(layoutCss).not.toMatch(/\.tpl[^{]*\{[^}]*padding-left/);
    expect(layoutCss).not.toMatch(/\.tpl[^{]*\{[^}]*padding-right/);
    expect(layoutCss).not.toMatch(/\.tpl[^{]*\{[^}]*padding-inline/);
    expect(layoutCss).toContain("--tdb-col-gutter"); // named in the contract, so the tie is stated
  });

  it("…and .tdb-col carries the gutter token + the one cap, auto-centred", () => {
    const todoCss = readFileSync(join(here, "todo.css"), "utf8");
    const i = todoCss.indexOf(".tdb-col {");
    const rule = todoCss.slice(i, todoCss.indexOf("}", i));
    expect(rule).toContain("max-width: var(--tdb-col-max)");
    /* ⚠️ SUPERSEDED 7 Aug 2026 — THE LEFT GUTTER IS LAW. `.tdb-col` carried `margin-inline: auto`,
       which centred it on its 1360px measure; a centred column's LEFT EDGE MOVES with the width
       available to it, so pages that resolved to different widths started their titles at
       different offsets — Today and the Noteboard sat inboard of the To-do list. Content is
       LEFT-ANCHORED now and the surplus becomes RIGHT margin. What these tests were protecting —
       that no page adds a one-sided inset of its own — is unchanged and asserted below. */
    /* ⚠️ NO AUTO MARGIN AT ALL (7 Aug, second pass). `margin-inline: auto` centred the column;
       `margin-inline: 0 auto` left-anchored it but ALSO disabled `align-items: stretch` — an auto
       margin on a flex container's cross axis does that — so the column shrink-wrapped its
       content. Measured collapsed: Calendar 295px with 26px cells, Today 557, Noteboard 477.
       `margin-inline: 0` keeps the stretch: fills, caps, sits hard left, surplus on the right. */
    expect(rule).toContain("margin-inline: 0;");
    expect(rule).not.toContain("margin-inline: auto");
    expect(rule).not.toContain("margin-inline: 0 auto");
    expect(rule).toContain("var(--tdb-col-gutter)");
  });

  it("⚠️ the Tasks slots are IDENTICAL in shape — fill+clip, no contentVariant, no exceptions", () => {
    /* THE CAUSE, pinned in two layers: three slots carried the ultrawide read cap (a
       placeholder-era leftover) while the board slot was bare — AND the board scrolled inside
       its own .tdb-wrap (a fill slot) while the other three scrolled the stage (flow slots),
       so the two chassis centred their columns in different available widths. Hardened on
       Nick's call (align the three to the BOARD): every slot is the board's own shape, so
       nothing about the mounting can differ at all. */
    const slots = [...app.matchAll(/<StagePage[^>]*routeKey === "todo"[^>]*>/g)].map((m) => m[0]);
    expect(slots.length).toBe(3); // list · calendar · noteboard (Today retired, P1 9 Aug)
    for (const slot of slots) {
      expect(slot, slot).not.toContain("contentVariant");
      /* ⚠️ `fillColumn` SINCE 7 Aug (was `fill`): `fill` renders the slot `display: block`, which
         left `.spine-root` resolving a percentage height against a flex-derived one. The law is
         unchanged — all four slots IDENTICAL — only the mode moved. */
      expect(slot, slot).toContain('layout="fillColumn"');
      expect(slot, slot).toContain("clip");
    }
  });

  it("no page wraps the layout in a capped or padded container of its own", () => {
    for (const [name, src] of [["list", listPage], ["calendar", calendarPage], ["noteboard", noteboardPage]] as const) {
      // the mount sits directly inside the page wrap — never inside a max-width/pad wrapper
      const before = src.slice(src.indexOf("return ("), src.indexOf("<TasksPageLayout"));
      expect(before, name).not.toContain("maxWidth");
      expect(before, name).not.toContain("sa-content-col");
    }
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

  /* ⚠️ TODAY'S TITLE-ROW SPEC WENT WITH THE PAGE (tasks-consolidation P1, 9 Aug). It asserted
     the ghost + ink pair on Today's own title line and the absence of a tool row there. The
     layout contract it sat inside is untouched — the header block is still ONE fixed unit the
     layout owns, and the three-slot tool-row rule (grow → pink right) still governs every page
     that HAS a tool row, asserted above. "Work the list" moves to the To-do list's tool row. */

  it("the sidebar prop is OPTIONAL, and no Tasks page passes it any more", () => {
    /* ⚠️ NARROWED THREE TIMES: 7 Aug (tasks-viewport P1) from three pages to one; 9 Aug
       (tasks-consolidation P1) Today retired outright; 9 Aug (P2) the To-do list's mount goes
       too, because the FILTERS facets asked "what KIND is this" and the consolidated page's five
       groups answer that permanently and in the open. The CONTRACT is what this file owns and it
       is untouched — absent means no aside at all, never an empty gutter (asserted against the
       rendered output above). `TodoSideContainer` survives unmounted with its own locks. */
    for (const [name, src] of [["list", listPage], ["calendar", calendarPage], ["noteboard", noteboardPage]] as const) {
      expect(src, `${name} runs full width`).not.toContain("sidebar={");
    }
  });
});

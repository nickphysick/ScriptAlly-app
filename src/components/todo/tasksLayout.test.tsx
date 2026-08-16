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
  /**
   * ⚠️ REVERSED: THE GUTTER IS THE GRID'S NOW, AND `.tdb-col`'s IS CANCELLED HERE. This asserted
   * that `tasksLayout.css` restated no horizontal padding, because the gutter belonged to
   * `.tdb-col`'s token and two sources would drift. The grid owns it for all ten pages — so
   * `.tdb-col`'s cap and gutter are what drift now: they sit ABOVE the grid and inset the header,
   * the toolbar and the scroller together, which measured as the Tasks pages' hairline landing
   * 40px further in than every other page's (367/143 against 327/103).
   * The cancellation is scoped to `.tpl` so the board's other surfaces keep their own column, and
   * the vertical values are untouched — they gutter content, which is a different job.
   */
  it("⚠️ the Tasks column cancels its own cap and gutter — the grid owns both", () => {
    const rule = /\.tdb-col\.tpl\s*\{([^}]*)\}/.exec(layoutCss);
    expect(rule, "the cancellation went — .tdb-col's 1360px cap and 40px gutter would inset the grid again").toBeTruthy();
    expect(rule![1], "the cap survives, so this page's header is narrower than every other").toContain("max-width: none");
    expect(rule![1], "the left gutter survives").toContain("padding-left: 0");
    expect(rule![1], "the right gutter survives").toContain("padding-right: 0");
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
      expect(before, name).not.toMatch(/["\s`]sa-content-col["\s`]/);
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

  it("the hairline is the GRID row's, not this page's", () => {
    /* ⚠️ RETARGETED (step 5). `.tpl-tools` drew the line while the Tasks pages hand-assembled their
       own header. They are on the shared grid now, where the boundary between chrome and content is
       row 1's bottom edge — and a line here as well would be the second hairline just removed from
       every other page. What this file still owns is the row's CONTENT. */
    expect(layoutCss, "the Tasks tool row drew its own hairline again — that is a second line under the header's")
      .not.toMatch(/\.tpl-tools\s*\{[^}]*border-bottom/s);
    /* ⚠️ AND THE SHARED ROW'S HAIRLINE IS GONE TOO (ref 91) — the boundary is drawn by the HEADER
       now, as the bottom edge of a parchment band, rather than by the row as a floating rule. What
       this case protects is unchanged: Tasks must not draw a second line of its own. */
    const hdr = readFileSync(join(here, "..", "shell", "pageHeader.css"), "utf8");
    expect(hdr, "nothing draws the chrome/content boundary — the band lost its edge").toContain("var(--wsh-band-edge)");
  });

  it("the sidebar is OPTIONAL — absent means no aside at all, never an empty gutter", () => {
    const bare = render(undefined);
    expect(bare).not.toContain("<aside");
    expect(bare).toContain('data-t="body"');
  });
});

/**
 * ⚠️ AMENDED BY THE SPLIT (rail + workspace, Phase 4). The law was "the tool row is the ONLY home
 * for page controls", and its substance is untouched: nothing floats mid-page, and a control that
 * changes what you see lives in a fixed block above the thing it changes.
 *
 * What the split added is a second THING to be above. The search narrows the RAIL — that is what
 * a search over a list of tasks does — so with the page in two columns it belongs above the rail,
 * in the rail's own non-scrolling tools block. Sort stays in the page tool row: it orders every
 * group at once and has no pane of its own.
 *
 * ⚠️ THE TENSION IS REAL AND IS FLAGGED RATHER THAN HIDDEN. Two instruments over one list now sit
 * in two places, and this page's own history warns about exactly that ("two instrument rows, one
 * under the other, is how the chip strip and the LISTS rows came to disagree"). The difference
 * claimed here is that these two are not a stack of rows over one surface — each sits above the
 * surface it acts on. If that turns out to be a distinction without a difference, the fix is to
 * move sort into the rail too, and this note is where the argument is recorded.
 */
describe("⚠️ every control sits above the surface it acts on, and nothing floats mid-page", () => {
  /**
   * ⚠️ THE PAGE HAS NO TOOL ROW AT ALL NOW (corrections, Phase 4). Everything between the header
   * plate and the control bar came out — the eyebrow, the tag dropdown, the count pills and
   * `Work the list`. Search and sort had already gone to the list card; `Add task or note` is the
   * control bar's. `TasksPageLayout` renders no row and no hairline when neither `tools` nor
   * `eyebrow` is passed, so the strip costs nothing rather than leaving a bare rule.
   *
   * The LAW is unchanged and asserted the other way round: every control sits above the surface
   * it acts on, and this page's surfaces are the list card and the bar.
   */
  it("the page passes no tool row, and nothing floats where one used to be", () => {
    expect(listPage).not.toContain("tools={renderTools()}");
    expect(listPage).not.toContain("function renderTools");
    expect(listPage).not.toContain("eyebrow={");
    expect(listPage).not.toContain('className="tdb-workb"');
    /* ⚠️ THE SURFACES THAT CARRY CONTROLS ARE THE LIST AND THE CARD NOW — the bar is gone, and its
       contents went to the things they act on. The rule this case holds is unchanged and is in fact
       better served: every control sits above the surface it acts on, and the bar was the one that
       sat above nothing in particular. */
    expect(listPage).toContain('className="tdw-tools"');   // the list's own instruments
    expect(listPage).toContain('className="tdw-foot"');    // the list's own counts + export
    expect(listPage).not.toContain('className="tdw-cbar"');
  });

  it("the RAIL's instruments live in renderRailTools, and nowhere else", () => {
    const railTools = listPage.slice(listPage.indexOf("function renderRailTools"), listPage.indexOf("function renderList"));
    /* ⚠️ THE CHIP STRIP FOLDED INTO THE FILTER MENU (corrections, Phase 5), and the standalone
       sort button became an icon beside it. Both are 38px icon buttons to the LEFT of the search,
       which fills the rest of the row. */
    for (const cls of ["tdw-search", "tdw-menuwrap", "tdw-cbic"]) {
      expect(railTools, cls).toContain(cls);
    }
    expect(railTools).not.toContain("tdw-chips");
    expect(railTools).not.toContain('className="tdw-sort"');
    /* the icons come BEFORE the field in the row */
    expect(railTools.indexOf("tdw-menuwrap")).toBeLessThan(railTools.indexOf("tdw-search"));
    /* the page row keeps none of it */
    expect(listPage).not.toContain("tdb-bsearch");
    expect(listPage).not.toContain('className="tdb-sortb"');
    /* the search left the page tool row entirely — not duplicated into the rail */
    expect(listPage).not.toContain("tdb-bsearch");
    const pageTools = listPage.slice(listPage.indexOf("function renderTools"), listPage.indexOf("function renderHero"));
    expect(pageTools).not.toContain("tdw-search");
  });

  it("⚠️ NEITHER BLOCK SCROLLS WITH WHAT IT NARROWS", () => {
    /* A control that scrolls away is gone exactly when a long list makes you want it. The page's
       row is the grid's toolbar (outside the scroll row by construction); the rail's is `flex:
       none` above its own scroller. */
    const splitCss = readFileSync(join(here, "todoSplit.css"), "utf8");
    const toolsRule = splitCss.slice(splitCss.indexOf(".tdw-tools {"), splitCss.indexOf("}", splitCss.indexOf(".tdw-tools {")));
    expect(toolsRule).toContain("flex: none");
    expect(listPage.indexOf("{renderRailTools()}")).toBeLessThan(listPage.indexOf(") : renderList()}"));
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

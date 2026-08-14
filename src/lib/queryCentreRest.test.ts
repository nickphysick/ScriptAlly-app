/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · §1 — THE REST STATE (ref design-refs/93-rest-final.html).
 *
 * Most of §1 landed with the rhythm pack; this file locks the whole of it in one place, including
 * the parts that were already true, because "already true" is exactly what stops being true
 * unwatched. What §1c actually moved is the list's three controls — down out of the grid's
 * page-wide toolbar row and into the head of the list COLUMN — and the button vocabulary that
 * followed them there.
 *
 * ⚠️ THIS REPO'S TESTS READ SOURCE (`vitest.config.ts` is `environment: 'node'` — no jsdom, no
 * testing-library), so nothing here proves a pixel. It proves the CAUSES the pixels follow from.
 * The seam's full height and the 34px agreement are browser-measured in the report; what is locked
 * here is the mechanism that makes them hold — that the seam is declared on the stretched column
 * rather than on any row, and that both buttons read one token rather than matching by hand.
 *
 * ⚠️ EVERY SLICE ANCHORS FIRST. The empty-database branch renders its OWN `.f12-list` earlier in
 * the file, so an unqualified `indexOf` measures that column and silently compares it against the
 * populated one. That is not hypothetical — it failed this file's first run.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { QueryStatus } from "../types";
import { queriesMastheadCounts } from "./queryAmbient";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
/** Comment-stripped: a rule ABOUT code must never be satisfied by prose describing it. */
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rule = (selector: string): string => {
  const i = css.indexOf("\n" + selector + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

/** The POPULATED list/pane row — the empty branch's body carries `f12-body-empty` and comes first. */
const populated = (): number => {
  const at = code.indexOf('className="f12-body">');
  expect(at, "the populated list/pane row is missing — every slice below would read the empty branch")
    .toBeGreaterThan(-1);
  return at;
};

describe("§1c · the list's controls sit at the head of the list column", () => {
  it("the head is inside the list column, above the rows, and the page-wide row is gone", () => {
    expect(code, "the grid's toolbar row came back — it spanned the pane too").not.toContain("toolbar={");
    const body = populated();
    const list = code.indexOf('className="f12-list"', body);
    const head = code.indexOf('className="f12-lhead"', body);
    const rows = code.indexOf('className="f12-rows"', body);
    expect(list, "the list column is missing").toBeGreaterThan(-1);
    expect(head, "the list head is missing").toBeGreaterThan(-1);
    expect(rows, "the rows container is missing").toBeGreaterThan(-1);
    expect(head).toBeGreaterThan(list);
    expect(head, "the head fell below the rows — it must head the column, not scroll with it").toBeLessThan(rows);
  });

  /**
   * ⚠️ SPLIT IN TWO BY §1, AND THE SCOPE ARGUMENT IS WHY. All three controls narrow the LIST, which
   * is what put them in the list COLUMN — that is unchanged. What §1 separates is their two jobs:
   * the search acts on the rows and stays pinned inside the panel with them; Filter and Sort act on
   * the SET, so they sit in the control cell over the panel, beside the count of that set.
   */
  it("the search stays inside the panel, with the rows it searches", () => {
    const body = populated();
    const head = code.indexOf('className="f12-lhead"', body);
    expect(head, "the panel's search row is missing").toBeGreaterThan(-1);
    const slice = code.slice(head, code.indexOf('className="f12-rows"', body));
    expect(slice, "the slice is empty — this case is testing nothing").toContain("f12-lsearch");
    expect(slice, "the search field left the panel").toContain('aria-label="Search queries"');
    /* ⚠️ AND ONE JOB ONLY. Filter and Sort in this row is the state §1 corrected. */
    expect(slice, "Filter came back to the search row").not.toContain('label="Filter"');
    expect(slice, "Sort came back to the search row").not.toContain('label="Sort"');
  });

  it("Filter and Sort sit in the list's control cell, over the count they narrow", () => {
    const cell = code.indexOf('className="qc-lhead"');
    expect(cell, "the list's control cell is missing").toBeGreaterThan(-1);
    const slice = code.slice(cell, code.indexOf('className="qc-phead"'));
    expect(slice, "the slice is empty — this case is testing nothing").toContain("qc-count");
    expect(slice, "Filter left the cell").toContain('label="Filter"');
    expect(slice, "Sort left the cell").toContain('label="Sort"');
    /* the count is the SCOPE's, from the same bucket function the pills read — never a fresh tally */
    expect(slice, "the sub-count stopped reading the shared bucket").toContain('queryBucket(q.status as QueryStatus) === "waiting"');
  });

  /* ⚠️ THE POINT OF THE WHOLE SPLIT. Six selected-query verbs used to sit above the list, all six
     dead until a row was picked. A control in a list-scope head governs the list, which always
     exists in this branch — so nothing here has a state in which it can go dead. */
  it("no control in the head is ever disabled, and no selected-query verb reached it", () => {
    const body = populated();
    const head = code.indexOf('className="f12-lhead"', body);
    const slice = code.slice(head, code.indexOf('className="f12-rows"', body));
    expect(slice, "a control in the list head can go dead").not.toContain("disabled");
    for (const verb of ["View tasks", "Nudge", "Download as PDF", "Delete"]) {
      expect(slice, `${verb} acts on the selected query and must not be in the list head`).not.toContain(verb);
    }
  });

  /* ⚠️ NOT GATED ON THE JOURNEY (§2). The old `toolbar` prop dropped these on
     `creating || recording` because the list was hidden then. The list stays mounted and visible
     under the sheet now, so a head that vanished would animate the desk behind the writer. */
  it("the head does not vanish while a journey is open", () => {
    const body = populated();
    const head = code.indexOf('className="f12-lhead"', body);
    const before = code.slice(code.indexOf('className="f12-list"', body), head);
    expect(before, "the head grew a journey gate — the desk must not change while the sheet is over it")
      .not.toMatch(/creating|recording/);
  });
});

describe("§1c · one button vocabulary", () => {
  /* Two icon-only controls one row apart, in two shapes and two sizes, read as two components
     rather than as one page. Both now read `--f12-icon-btn` and `--r-md` — matching by TOKEN, so
     they cannot drift; matching by literal only holds until someone edits one of them. */
  it("the pill, the kebab and the search field all read the same size token", () => {
    for (const sel of [".f12-pill", ".qc-kebab", ".f12-lhead .f12-lsearch"]) {
      const r = rule(sel);
      expect(r, `${sel} has no rule — it would take its size from its contents`).not.toBe("");
      expect(r, `${sel} restated a number instead of reading the token`).toContain("height: var(--f12-icon-btn)");
    }
    expect(css, "the size token is not declared").toContain("--f12-icon-btn: 34px");
  });

  it("the pill and the kebab share the radius the rest of the page's buttons use", () => {
    for (const sel of [".f12-pill", ".qc-kebab"]) {
      expect(rule(sel), `${sel} left the shared radius`).toContain("border-radius: var(--r-md)");
    }
    expect(rule(".f12-pill"), "the circle came back — that is the divergence, restored")
      .not.toContain("border-radius: 999px");
  });

  /* An icon-only control still has to announce itself. The word survives three ways: hover, the
     accessible name, and the header of the popover each one opens. */
  it("dropping the label did not drop the name", () => {
    const shell = read("../components/shell/F12Shell.tsx");
    expect(shell, "no tooltip: an icon-only control the user must hover to identify").toContain("title={label}");
    expect(shell, "the accessible name went with the label").toContain("aria-label={value ? `${label}: ${value}` : label}");
  });

  it("an active filter carries a count badge; Sort carries none", () => {
    const badge = rule(".f12-pill .f12-pcount");
    expect(badge, "the count badge is missing").not.toBe("");
    expect(badge).toContain("background: var(--burg)");
    const body = populated();
    const at = code.indexOf('label="Sort"', body);
    expect(at, "the Sort trigger is missing").toBeGreaterThan(-1);
    const sort = code.slice(at, at + 400);
    expect(sort, "Sort grew a count badge — a single-choice control states itself in its popover")
      .not.toContain("count=");
  });
});

describe("§1c · the seam runs the full height of both columns", () => {
  /**
   * ⚠️ DECLARED ON THE COLUMN, NOT ON THE ROWS — which is the whole mechanism. `.f12-list` is a
   * stretched flex child of `.f12-body`, so its right border spans the row's height whatever the
   * rows inside it come to. Move the line onto `.f12-rows` and it stops at the last row, which is
   * exactly the "short list" case §1c names. The measurement is in the report; this locks the cause.
   */
  /**
   * ⚠️ REPOINTED BY FIX PACK 5. The seam WAS the column's `border-right`, which was right while the
   * list was the full-height column. It is an inset panel now, so a border on it would stop where
   * the panel stops and the divider would have a gap at the top and another at the foot — the same
   * fault this case was written to prevent, arriving by a different route.
   *
   * It is drawn by `.f12-body::after` instead: full height of the row, positioned one pixel back
   * from the column boundary so it is collinear with the panel's own right rim. One line, no
   * doubling, and no dependence on how tall the panel happens to be.
   */
  /* ⚠️ INVERTED BY FIX PACK 6 §2 — the seam is deleted and the panel's rim is the division. The
     full-height argument was about a line that had to outlast an inset panel; there is no line. */
  it("⚠️ NO SEAM — the panel's rim divides the columns", () => {
    expect(rule(".f12-body::after"), "the seam came back — a second division beside the panel's rim").toBe("");
    expect(rule(".f12-list"), "the panel took a right border of its own — that is the seam by another name")
      .not.toContain("border-right");
    expect(rule(".f12-rows"), "the seam moved onto the scrolling rows — it would stop at the last one")
      .not.toContain("border-right");
  });

  it("the row that holds both columns stretches them, so neither can be short of the other", () => {
    const body = rule(".f12-body");
    expect(body, "the body rule is missing").not.toBe("");
    /* ⚠️ A GRID SINCE §1, AND THE CLAUSE IS THE SAME ONE. A flex row stretched its two columns by
       default; a grid stretches its two cells by default, for the same reason and with the same
       failure mode — naming a cross-axis alignment is still the one edit that silently shortens a
       column. `minmax(0, 1fr)` on the second row is what lets both scroll internally rather than
       growing the page, which `min-height: 0` did on the flex row. */
    expect(body, "the row stopped being a grid").toContain("display: grid");
    /* ⚠️ THE FIRST TRACK IS A FIXED 36 SINCE THE ALIGNMENT AMENDMENT — `auto` sized the control band
       to whichever cell was taller, so the row's height was decided by a font metric. The clause
       this case is about is the SECOND track: `minmax(0, 1fr)` is what lets both columns scroll
       internally rather than growing the page. */
    expect(body, "the panel row lost its zero-floor — the columns would grow the page instead of scrolling")
      .toContain("grid-template-rows: 36px minmax(0, 1fr)");
    expect(body, "the row set a cross-axis alignment — anything but stretch shortens a column")
      .not.toMatch(/align-items\s*:/);
  });
});

describe("§1b · the masthead states counts, from the shared derivation", () => {
  it("the page reads the selector rather than counting for itself", () => {
    expect(code, "the masthead stopped reading the shared derivation")
      .toContain("description={queriesMastheadCounts(mastheadScopedQueries)}");
    expect(code, "the masthead grew a count of its own").not.toMatch(/description=\{`\$\{\w+\.length\}/);
  });

  /* Composed from `queryBucket` — the same function the filter pills and `getPrimaryAction` read —
     so the masthead cannot disagree with the list beneath it about whose turn anything is. */
  it("the counts are the buckets, and the awaiting clause omits itself at zero", () => {
    const q = (status: QueryStatus) => ({ status });
    expect(queriesMastheadCounts([q(QueryStatus.QUERIED), q(QueryStatus.REJECTED)]))
      .toBe("2 queries · 1 awaiting reply");
    expect(queriesMastheadCounts([q(QueryStatus.REJECTED)]), "a zero clause was printed").toBe("1 query");
    expect(queriesMastheadCounts([]), "an empty page printed a clause about nothing").toBe("0 queries");
  });
});

describe("§1d · the list column's own foot", () => {
  it("count and Export CSV close the column", () => {
    const body = populated();
    const foot = code.indexOf('className="f12-lfoot"', body);
    expect(foot, "the list foot is missing").toBeGreaterThan(-1);
    const slice = code.slice(foot, foot + 400);
    expect(slice, "the count left the foot").toContain("SHOWING");
    expect(slice, "Export CSV left the foot").toContain("EXPORT CSV");
  });
});

describe("§1e / §1f · the verbs have a subject, or they are not drawn", () => {
  /**
   * ⚠️ THE MENU IS DELETED (§2), AND THE CLAUSE IT PROTECTED SURVIVES IT. "Absent, not greyed" was
   * about a MENU with no subject — a menu that has nothing to be about is not a menu that cannot
   * run. The same rule now applies to the row that replaced it: the whole cell renders nothing when
   * there is no query and no agent.
   *
   * ⚠️ THE OTHER CLAUSE — "the verbs INSIDE grey individually" — also survives, and §2 sharpens it:
   * Nudge greys on the rule that fires its to-do task, and greying is a lighter border and a muted
   * icon at the SAME width, so the row keeps its shape as the selection moves.
   */
  it("the verbs have a subject or they are not drawn", () => {
    const cell = code.indexOf('className="qc-phead"');
    expect(cell, "the pane's control cell is missing").toBeGreaterThan(-1);
    expect(code.indexOf("{activeQuery && activeAgent ? (() => {", cell), "the cell lost its selection guard")
      .toBeGreaterThan(cell);
    /* and the filtered-to-zero branch still exists — it is the state in which nothing is selected */
    expect(code.indexOf("qc-nomatch"), "the filtered-to-zero branch is missing").toBeGreaterThan(-1);
  });

  /**
   * ⚠️ INVERTED BY §2. This asserted "all six verbs are in the menu": View tasks, Nudge, Agent,
   * Manuscript, Download as PDF, Delete query. Four of those six were never query verbs — Agent and
   * Manuscript were RECORDS and were permanently disabled because a menu is not a place a record
   * can be opened from; View tasks and the PDF are exports of one kind or another. The row is four
   * verbs, and each of the six old items is accounted for below rather than assumed.
   */
  it("the six old menu items are each accounted for — none was quietly dropped", () => {
    const cell = code.indexOf('className="qc-phead"');
    const row = code.slice(cell, code.indexOf("})() : null}", cell));
    expect(row, "the slice is empty — this case is testing nothing").toContain("qc-btn");
    /* two are verbs and stay in the row */
    expect(row, "Nudge left the row").toContain("<span>Nudge</span>");
    expect(row, "Delete left the row").toContain("<span>Delete</span>");
    /* the two records moved to their own names */
    expect(code, "the agent record lost its way in — the ⋯ item was disabled, so the name is now the link")
      .toContain('className="qp-hlink"');
    expect(code, "the manuscript lost its way in").toContain("qp-msname");
    /* View tasks kept its handler and moved to Tracking, where this query's work is named */
    expect(code, "View tasks lost its opener").toContain("setIsTasksOpen(true)");
    expect(code, "the task count is not on Tracking's band").toContain('className="qp-cardact"');
    /* ⚠️ AND THE PDF IS REPORTED, NOT RESOLVED. Its subject IS the query, so by §2's own rule it
       cannot move — and it is not among the four verbs. It stays as an icon rather than being
       deleted to make a list of four come out right. */
    expect(code, "Download as PDF was deleted rather than flagged").toContain("Download this query as PDF");
    expect(row, "the PDF grew a label — the four LABELLED verbs would read as five").not.toContain("<span>Download");
  });

  /* §1f, re-scoped by recon: an auto-select fallback means "nothing selected" is only reachable
     when the FILTER matched nothing. So that is the state to design, and the pane is where it
     belongs — the list is empty by definition, and a note inside an empty column is a note nobody
     is looking at. */
  it("filtered-to-zero states the cause in the pane and offers the way back", () => {
    const at = code.indexOf("qc-nomatch");
    expect(at, "the filtered-to-zero state is missing").toBeGreaterThan(-1);
    const slice = code.slice(at, at + 700);
    expect(slice, "the state stopped naming its cause").toContain("No queries match these filters");
    expect(slice, "the way back went — a dead end is not a state, it is a trap").toContain("Clear filters");
    /* clears the SEARCH too: a search term is just as likely to be what emptied the view, and a
       button that restores only half the view does not restore the view. */
    expect(slice, "Clear filters stopped clearing the search").toContain("setListSearch(\"\")");
  });

  it("the auto-select fallback stays — it is what makes the empty-filter state the only subject-less one", () => {
    expect(code, "the auto-select went, and 'nothing selected' became reachable with queries on file")
      .toContain("setSelectedQueryId(sortedList[0].id)");
  });
});

describe("§1g · the row carries status through the real StatusDot", () => {
  it("the dot is the imported component, beside the date, never a recreation", () => {
    expect(queries, "StatusDot is not imported").toMatch(/import .*StatusDot.*from/);
    const body = populated();
    const rows = code.indexOf('className="f12-rows"', body);
    const end = code.indexOf('className="f12-lfoot"', body);
    const slice = code.slice(rows, end);
    expect(slice, "the row's status dot is gone").toContain("<StatusDot status={q.status}");
    /* ⚠️ §5 MADE THE FIGURE A POSITION, so the class is conditional — `f12-d2` plus `f12-d2-late`
       once the row is counting up. The slot itself is what this case is about and it is still one
       element in the same place; the date fallback survives inside it for a row that cannot be
       placed in time. */
    expect(slice, "the date/position slot left the row").toContain("className={`f12-d2");
    expect(slice, "the position figure is not derived").toContain("figureText(figure)");
    expect(slice, "an unplaceable row lost its date fallback").toContain("formatListRowDate(q.dateSent)");
  });
});

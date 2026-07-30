/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 3 locks — the reading pane's three states (ref empty-states-ref.html,
 * option 1 for the zero-state).
 *
 * The distinction that matters: a page with NO queries gets the ghost preview (here is what this
 * becomes); a page whose FILTERS emptied the view does not (the page isn't empty, the view is) —
 * it gets a quiet note and a way back. Confusing the two is the classic empty-state mistake.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");

describe("zero queries → ghost preview behind a welcome card", () => {
  it("renders the skeleton of the REAL anatomy: a hero and three columns", () => {
    expect(queries).toContain("qc-ghost");
    expect(queries).toContain("qc-ghost-hero");
    expect(queries).toContain("qc-ghost-cols");
  });

  it("the ghost is inert — faded, and it can never take a click", () => {
    const ghost = css.slice(css.indexOf(".qc-ghost {"), css.indexOf("}", css.indexOf(".qc-ghost {")));
    expect(ghost).toContain("pointer-events: none");
    expect(ghost).toContain("opacity: 0.38");
    expect(queries, "the ghost must also be hidden from assistive tech").toContain('className="qc-ghost" aria-hidden="true"');
  });

  it("the welcome card carries the ref's copy and ONE primary, which enters create mode", () => {
    expect(queries).toContain("Your first query starts here");
    expect(queries).toContain("Log your first query");
    expect(queries).toContain('className="f12-btn-pri" onClick={() => openCreate()}');
  });

  it("the old welcome pane's routes survive as quiet alternatives, not deletions", () => {
    expect(queries).toContain("Import a spreadsheet");
    expect(queries).toContain("ScriptAlly-pipeline-import-template.xlsx");
  });
});

describe("has queries → auto-select, remembering the last one viewed", () => {
  it("the last-viewed id persists under the house `sa.` prefix", () => {
    expect(queries).toContain('"sa.queries.lastViewed"');
    expect(queries).toContain("writeLastViewedQueryId");
  });

  it("a remembered id is only honoured while the query still EXISTS", () => {
    expect(queries).toContain("queries.some((q) => q.id === remembered)");
  });

  it("the fallback is the first row of the CURRENT SORT, not the raw array's first", () => {
    expect(queries).toContain("setSelectedQueryId(sortedList[0].id)");
    expect(queries, "the old raw-array fallback is back").not.toContain("setSelectedQueryId(queries[0].id)");
  });

  it("reading the preference never throws in private mode", () => {
    expect(queries).toContain("try { return localStorage.getItem(LAST_VIEWED_KEY); } catch");
  });
});

describe("filtered/searched to zero → a quiet note, NOT the ghost", () => {
  it("the pane says so and offers one tap back", () => {
    expect(queries).toContain("qc-nomatch");
    expect(queries).toContain("No queries match these filters.");
    expect(queries).toContain("Clear filters");
  });

  it("that tap clears the SEARCH as well as the filters — otherwise it's a dead end", () => {
    expect(queries).toContain("resetAllFilters(); setListSearch(\"\");");
  });

  it("this branch is reached only when the LIST is empty but the page is not", () => {
    // `sortedList.length === 0` sits after the create/selected branches, inside the populated page.
    expect(queries).toContain(") : sortedList.length === 0 ? (");
  });
});

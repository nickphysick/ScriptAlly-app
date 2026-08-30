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
import { sliceBetween } from "../test/sliceBetween";
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

/**
 * ══ NOTHING SELECTS IMPLICITLY ════════════════════════════════════════════════════════════════
 *
 * ⚠️ THIS DESCRIBE IS INVERTED, AND THE BEHAVIOUR IT GUARDED IS WHAT BROKE THE PAGE. It asserted
 * that the page auto-selected on load, remembering the last query viewed under the house `sa.`
 * prefix, honouring a remembered id only while the query still existed, and never throwing in
 * private mode. Every one of those was a correct assertion about a coherent mechanism — while the
 * two-pane layout WAS the page and there was nowhere else to land.
 *
 * ⚠️ `?q=` NOW MEANS "RECORD VIEW", so an auto-select on load made the browsing grid UNREACHABLE:
 * the page opened straight into a record and `← All queries` could not get out, because the same
 * effect re-selected the remembered id the moment the param went away. The store is deleted, writer
 * and key, and what replaces these cases is the opposite claim.
 */
describe("nothing selects a query implicitly", () => {
  it("⚠️ THE LAST-VIEWED STORE IS GONE — reader, writer and key", () => {
    for (const token of ["readLastViewedQueryId", "writeLastViewedQueryId", "LAST_VIEWED_KEY", "sa.queries.lastViewed"]) {
      expect(queries, `\`${token}\` survives — a store nothing consumes`).not.toContain(token);
    }
  });

  it("⚠️ AND THE SKELETON NO LONGER WAITS FOR A REMEMBERED ROW", () => {
    /* it held the page behind a skeleton until the restored query had loaded — right while
       something restored one, and a grid held behind a spinner for a row it will never open once
       nothing does */
    /* ⚠️ COMMENTS STRIPPED FIRST. The file explains the deletion by NAMING the thing deleted — this
       repo's prose is unusually rich in exactly the tokens its locks forbid, because every retirement
       here is documented by quoting what it retired. A bare `toContain` finds the explanation. */
    const decls = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls, "`awaitingRemembered` survives its own mechanism").not.toContain("awaitingRemembered");
  });

  it("⚠️ THE PARAM IS READ IN BOTH DIRECTIONS — present selects, absent clears", () => {
    /* ⚠️ THE CLEARING HALF IS THE ONE THAT WAS MISSING, and its absence is why the back link looked
       inert: the effect only ever SET a selection, so removing `?q=` left the old one standing. */
    expect(queries, "the selection effect no longer clears when the param goes").toContain("if (!wanted && selectedQueryId !== null) setSelectedQueryId(null)");
    expect(queries, "an unresolvable id clears the selection — that races the data on a slow load")
      .toContain("never merely unresolvable");
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

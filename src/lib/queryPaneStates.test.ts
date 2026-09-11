/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 3 locks — the reading pane's three states (ref empty-states-ref.html,
 * option 1 for the zero-state).
 *
 * The distinction that matters: a page with NO queries gets one card (the first-query card since
 * the Grid pass, §6 — the ghost preview it replaced is retired); a page whose FILTERS emptied the
 * view gets another (the page isn't empty, the view is). Confusing the two is the classic
 * empty-state mistake, and the choice between them is `gridEmptyKind`'s, locked in its own suite.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from "fs";

const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");

/**
 * ⚠️ RETARGETED 11 Sep (Grid pass §6). The ghost preview and the welcome card over it are REPLACED
 * by the ref's first-query card, as the brief asks. Their locks are not repointed at the new card —
 * a lock aimed at a different subject is a lock inventing a claim — so the anatomy locks become the
 * statement that the anatomy is gone, and the two claims that outlive it stay: one primary that
 * enters create mode, and the routes that survived the last swap survive this one.
 */
describe("zero queries → the first-query card (the ghost preview is retired)", () => {
  const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("the ghost preview is gone from the page and its rules from the sheet, not hidden", () => {
    expect(code).not.toMatch(/["\s`]qc-ghost["\s`]/);
    expect(code).not.toContain("qc-welcome");
    expect(css).not.toMatch(/(?:^|\n)\.qc-ghost \{/);
    expect(css).not.toMatch(/(?:^|\n)\.qc-welcome \{/);
  });

  it("the card's ONE primary enters create mode", () => {
    expect(code).toContain('<QueryEmptyCard kind="first" logRef={logTriggerRef} onLog={() => openCreate()}');
  });

  it("the old welcome pane's routes survive as quiet alternatives, not deletions", () => {
    expect(code).toContain('onImport={() => onNavigate?.("import")}');
    const card = readFileSync(new URL("../components/queries/QueryEmptyCard.tsx", import.meta.url), "utf8");
    expect(card).toContain("ScriptAlly-pipeline-import-template.xlsx");
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ TWO CARDS, THE REF'S WORDS, AND THE PAGE'S TWO SLOTS FOR THEM (Grid pass §6).
 *
 * The words are read back from the artefact rather than retyped here, so the build and the ref
 * cannot drift apart without this failing. Which card shows is `gridEmptyKind`'s decision and is
 * asserted in `queryGridEmpty.test.ts`; this file asserts what each card draws, and that the page
 * puts each one only in the slot the selector names.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryEmptyCard, EMPTY_COPY, TEMPLATE_HREF } from "./QueryEmptyCard";
import { sliceBetween } from "../../test/sliceBetween";

const REF = readFileSync(join(process.cwd(), "design-refs/query-grid-enhancements-v1.html"), "utf8");
const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");
const noop = () => {};
/** what React writes for text — an apostrophe is an entity in markup */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const first = renderToStaticMarkup(<QueryEmptyCard kind="first" onLog={noop} onImport={noop} />);
const filtered = (line: string | null, see: (() => void) | null) =>
  renderToStaticMarkup(<QueryEmptyCard kind="filtered" line={line} onSeeWaiting={see} onClear={noop} />);
const LINE = "7 queries are with agents and inside their windows. The next reply is expected on 20 Sep.";

describe("the words are the ref's — read back from the artefact, not retyped", () => {
  it("every string both cards print appears verbatim in section 4 of the ref", () => {
    const words = [
      EMPTY_COPY.first.title, EMPTY_COPY.first.line, EMPTY_COPY.first.cta, EMPTY_COPY.first.alt,
      EMPTY_COPY.filtered.title, EMPTY_COPY.filtered.cta, EMPTY_COPY.filtered.alt,
    ];
    for (const w of words) expect(REF, `"${w}" is not the ref's`).toContain(w);
  });
});

describe("each card draws its own moment and never the other's", () => {
  it("the first-query card", () => {
    for (const w of [EMPTY_COPY.first.title, EMPTY_COPY.first.line, EMPTY_COPY.first.cta, EMPTY_COPY.first.alt])
      expect(first).toContain(esc(w));
    expect(first).not.toContain(esc(EMPTY_COPY.filtered.title));
    expect(first).not.toContain(esc(EMPTY_COPY.filtered.cta));
  });

  it("the filtered card", () => {
    const html = filtered(LINE, noop);
    for (const w of [EMPTY_COPY.filtered.title, EMPTY_COPY.filtered.cta, EMPTY_COPY.filtered.alt, LINE])
      expect(html).toContain(esc(w));
    expect(html).not.toContain(esc(EMPTY_COPY.first.title));
    expect(html).not.toContain(esc(EMPTY_COPY.first.line));
  });

  it("both carry the named placeholder slot, 96px and round, until artwork exists", () => {
    for (const [html, name] of [[first, "empty · first"], [filtered(LINE, noop), "empty · filtered"]] as const) {
      expect(html).toContain("qi-slot--round");
      expect(html).toContain("width:96px;height:96px");
      expect(html).toContain(name);
    }
  });

  it("⚠️ the filtered card omits what it cannot honestly offer — no line about nothing, no door to nothing", () => {
    const bare = filtered(null, null);
    expect(bare).not.toContain("<p");
    expect(bare).not.toContain(esc(EMPTY_COPY.filtered.cta));
    expect(bare, "the way back went too").toContain(esc(EMPTY_COPY.filtered.alt));
  });

  it("the import template survives the swap — the one route the ref does not draw", () => {
    expect(first).toContain(`href="${TEMPLATE_HREF}"`);
    expect(first).toContain("download");
  });
});

describe("the page puts each card only in the slot the selector names", () => {
  it("the empty-database branch is the selector's `first`, and draws the first-query card", () => {
    const branch = sliceBetween(page, 'emptyKind === "first" ? (', ") : (");
    expect(branch).toContain('<QueryEmptyCard kind="first"');
    expect(branch).toContain("onLog={() => openCreate()}");
    expect(branch).toContain('onImport={() => onNavigate?.("import")}');
  });

  it("the view slot is the selector's `filtered`, then `nomatch` — the card, then the plain line", () => {
    const card = sliceBetween(page, 'emptyKind === "filtered" ? (', 'emptyKind === "nomatch" ? (');
    expect(card).toContain('kind="filtered"');
    expect(card).toContain("onClear={resetAllFilters}");
    const none = sliceBetween(page, 'emptyKind === "nomatch" ? (', 'gridView === "list" ? (');
    expect(none).toContain('className="qcc-none"');
    expect(none).not.toContain("QueryEmptyCard");
  });

  it("⚠️ the card's count is taken over the set the tiles count, never the filtered view", () => {
    expect(page, "the tiles stopped counting the scoped set").toMatch(/quickCounts\(\s*mastheadScopedQueries\.map/);
    expect(page, "the card's summary is not over the tiles' set").toContain("waitingSummary(mastheadScopedQueries.map(");
  });

  it("'See what's waiting' sets the With-the-agent tile, and keeps the scope its count was taken over", () => {
    const body = sliceBetween(page, "const seeWaiting = () => {", "};");
    expect(body).toContain('setQuickKey("agent")');
    expect(body, "the CTA widened the scope its number was counted in").not.toContain("setSelectedManuscriptFilter");
  });

  it("the retired welcome pane is gone, not left beside the card", () => {
    expect(page).not.toContain("Your first query starts here");
    expect(page).not.toMatch(/["\s`]qc-welcome["\s`]/);
  });
});

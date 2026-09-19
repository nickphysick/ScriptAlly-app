/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE CARD NOW (empty-states pack, Phase 2) — the `first` variant is retired with its card.
 *
 * The words are read back from the artefact rather than retyped, so the build and the ref cannot
 * drift apart without this failing. Which card shows is `gridEmptyKind`'s decision and is asserted
 * in `queryGridEmpty.test.ts`; this file asserts what the filtered card draws, and that the page
 * puts it only in the slot the selector names.
 *
 * ⚠️ WHERE THE `first` CASES WENT, NAMED, so none of them lapses into a gap nobody owns.
 * `queryEmptyFeatures.test.tsx` carries all five: the ref-verbatim words (now read from the v3
 * feature-led ref), the "draws its own moment and not the other's" pair, the import-template route,
 * and the page mounting the right thing in the selector's `first` slot.
 *
 * ⚠️ ONE CLAIM DID NOT MOVE, BECAUSE IT STOPPED BEING TRUE — and that is a change worth stating.
 * The first-query card carried a named 96px `IlloSlot`, the chrome that admits an illustration is
 * unfinished. The feature-led page has no commissioned slot: its illustrations are DRAWN examples,
 * each wearing a dashed "Example" pill, which is a different admission of the same kind. The
 * filtered card keeps its slot and this file still asserts it.
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

const filtered = (line: string | null, see: (() => void) | null) =>
  renderToStaticMarkup(<QueryEmptyCard kind="filtered" line={line} onSeeWaiting={see} onClear={noop} />);
const LINE = "7 queries are with agents and inside their windows. The next reply is expected on 20 Sep.";

describe("the words are the ref's — read back from the artefact, not retyped", () => {
  it("every string the card prints appears verbatim in section 4 of the ref", () => {
    const words = [EMPTY_COPY.filtered.title, EMPTY_COPY.filtered.cta, EMPTY_COPY.filtered.alt];
    for (const w of words) expect(REF, `"${w}" is not the ref's`).toContain(w);
  });

  it("⚠️ the retired variant is GONE from the copy table, not merely unrendered", () => {
    /* a constant left behind is the next person's evidence that the card still exists */
    expect(Object.keys(EMPTY_COPY)).toEqual(["filtered"]);
    const src = readFileSync(join(process.cwd(), "src/components/queries/QueryEmptyCard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toContain('"first"');
    expect(src).not.toContain("Your first query goes here");
  });
});

describe("the card draws its own moment", () => {
  it("the filtered card", () => {
    const html = filtered(LINE, noop);
    for (const w of [EMPTY_COPY.filtered.title, EMPTY_COPY.filtered.cta, EMPTY_COPY.filtered.alt, LINE])
      expect(html).toContain(esc(w));
    /* the retired card's headline must not reappear here */
    expect(html).not.toContain(esc("Your first query goes here"));
  });

  it("carries the named placeholder slot, 96px and round, until artwork exists", () => {
    const html = filtered(LINE, noop);
    expect(html).toContain("qi-slot--round");
    expect(html).toContain("width:96px;height:96px");
    expect(html).toContain("empty · filtered");
  });

  it("⚠️ the filtered card omits what it cannot honestly offer — no line about nothing, no door to nothing", () => {
    const bare = filtered(null, null);
    expect(bare).not.toContain("<p");
    expect(bare).not.toContain(esc(EMPTY_COPY.filtered.cta));
    expect(bare, "the way back went too").toContain(esc(EMPTY_COPY.filtered.alt));
  });

  it("the import template's constant survives the retirement — its consumer moved, it did not go", () => {
    /* ⚠️ ASSERTED HERE BECAUSE THIS FILE IS WHERE THE CONSTANT LIVES; that the HERO renders it is
       `queryEmptyFeatures.test.tsx`'s claim. Two halves of one route, each asserted where it is. */
    expect(TEMPLATE_HREF).toBe("/QueryHawk-pipeline-import-template.xlsx");
  });
});

describe("the page puts each card only in the slot the selector names", () => {
  it("the empty-database branch no longer draws this card at all", () => {
    const branch = sliceBetween(page, 'emptyKind === "first" ? (', ") : (");
    expect(branch).not.toContain("QueryEmptyCard");
    /* what it draws instead is `queryEmptyFeatures.test.tsx`'s claim, not this file's — bounded,
       because a tag name is a prefix of every longer one */
    expect(branch).toMatch(/<QueryEmptyFeatures[\s/>]/);
  });

  it("the view slot is the selector's `filtered`, then `nomatch` — the card, then the plain line", () => {
    const card = sliceBetween(page, 'emptyKind === "filtered" ? (', 'emptyKind === "nomatch" ? (');
    expect(card).toContain('kind="filtered"');
    /* ⚠️ RETARGETED (v11): "clear" is the SENTENCE's filter now; the scope stays, as it always did */
    expect(card).toContain("onClear={clearQcFilter}");
    const none = sliceBetween(page, 'emptyKind === "nomatch" ? (', 'gridView === "list" ? (');
    expect(none).toContain('className="qcv-none"');
    expect(none).not.toContain("QueryEmptyCard");
  });

  it("⚠️ the card's count is taken over the set the tiles count, never the filtered view", () => {
    /* ⚠️ RETARGETED (v11): the tiles are gone; the set they counted is the one the sentence's MENU
       counts now — `qcScoped`, the manuscript-scoped rows. The law is unchanged: the card's line and
       the menu's "With the agent" are taken over the same set, never the filtered view. */
    expect(page, "the menu stopped counting the scoped set").toContain("options={filterOptions(qcScoped)}");
    expect(page, "the card's summary is not over the menu's set").toContain("waitingSummary(qcScoped.map(");
  });

  it("'See what's waiting' sets the With-the-agent tile, and keeps the scope its count was taken over", () => {
    const body = sliceBetween(page, "const seeWaiting = () => {", "};");
    /* ⚠️ RETARGETED (v11): it sets the sentence's With the agent, exactly as the menu does */
    expect(body).toContain('setQcFilter("agent")');
    expect(body, "the CTA widened the scope its number was counted in").not.toContain("setQcScope");
    expect(body, "the CTA widened the scope its number was counted in").not.toContain("setSelectedManuscriptFilter");
  });

  it("the retired welcome pane is gone, not left beside the card", () => {
    expect(page).not.toContain("Your first query starts here");
    expect(page).not.toMatch(/["\s`]qc-welcome["\s`]/);
  });
});

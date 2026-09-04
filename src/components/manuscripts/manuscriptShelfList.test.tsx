/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THREE CLAIMS ARE CARRIED FORWARD FROM THE RETIRED CAROUSEL'S DEFECT LOCK rather than lapsing
 * with it: the cover is sage and not tan, it is drawn as a BOOK rather than a rectangle, and the
 * shelf states the full date rather than a bare month. They were defects seen on dev; the component
 * changed, the defects did not stop being possible.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptShelfList } from "./ManuscriptShelfList";
import { Manuscript, Query, QueryStatus } from "../../types";

/* ⚠️ THE SPREAD IS NOT OPTIONAL. The first version of this helper took `over` and never used it,
   so a case asking for a manuscript with no word count silently got one with 92,000 — a fixture
   that cannot produce the input its own test is about. tsc cannot see it; the assertion did. */
const ms = (over: Partial<Manuscript> = {}): Manuscript => ({
  id: "ms-1", userId: "u", title: "Murphy's Day Out", genre: "literary-fiction",
  ageCategory: "Adult", wordCount: 92000, logline: "", status: "Querying",
  comps: [], shelved: false, ...over,
} as Manuscript);

const q = (over: Partial<Query> = {}): Query => ({
  id: "q1", userId: "u", manuscriptId: "ms-1", agentId: "ag-1",
  status: QueryStatus.QUERIED, dateSent: "2023-12-05", sendMethod: "Email", ...over,
} as Query);
void q;

const list = (over: Partial<React.ComponentProps<typeof ManuscriptShelfList>> = {}) =>
  renderToStaticMarkup(
    <ManuscriptShelfList
      manuscripts={[ms()]}
      queries={[q()]}
      genresOf={() => ["Adult", "Literary fiction"]}
      statusOf={(m) => m.status}
      onOpen={() => {}}
      onAdd={() => {}}
      {...over}
    />,
  );

const css = readFileSync(join(__dirname, "manuscriptShelfList.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("the shelf list", () => {
  it("states the six columns", () => {
    const head = list().slice(list().indexOf("<thead>"), list().indexOf("</thead>"));
    for (const c of ["Manuscript", "Status", "Queries", "Responses", "Last sent", "Open"]) {
      expect(head, `${c} is missing from the header`).toContain(c);
    }
  });

  /**
   * ⚠️ THE ROW'S CONTROL IS A REAL BUTTON. A clickable `<td>` is not keyboard-reachable, announces
   * nothing, and does not fire on Enter or Space. Asserted as the absence of a handler on a cell as
   * well as the presence of the button — one without the other is half the claim.
   */
  it("makes every row's control a button, and no cell clickable", () => {
    const html = list();
    expect(html).toContain('<button type="button" class="msl-open"');
    expect(html, "a cell carries its own click handler").not.toMatch(/<td[^>]*onclick/i);
    expect(html, "a row carries its own click handler").not.toMatch(/<tr[^>]*onclick/i);
  });

  /** ⚠️ Six rows of "Open" tell a screen-reader user nothing about which book they are on. */
  it("names each Open control with its book", () => {
    expect(list()).toContain('aria-label="Open Murphy&#x27;s Day Out"');
  });

  /**
   * ⚠️ THE ADD CONTROL IS BENEATH THE TABLE, NOT A ROW IN IT. As a `<tr>` it would be announced as
   * data — one more manuscript in a table of manuscripts — when it is an action.
   */
  it("puts the add row outside the table body", () => {
    const html = list();
    const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    expect(body).not.toContain("msl-add");
    expect(html).toContain("msl-add");
    expect(html.indexOf("</table>")).toBeLessThan(html.indexOf("msl-add"));
  });

  /**
   * ⚠️ THE FIGURES ARE `bookFigures`', NOT THE LIST'S OWN. A shelf that counted its own way would
   * disagree with the page it links to about the same book, one click apart. The seed carries one
   * query and no response, so the row must SAY one and nought.
   */
  it("states the real derived counts, from the book page's derivation", () => {
    const html = list();
    const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    expect(body).toContain('<td class="msl-num">1</td><td class="msl-num">0</td>');
    const src = readFileSync(join(__dirname, "ManuscriptShelfList.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src, "the list grew its own counting").toContain("bookFigures(mine)");
  });

  /** ⚠️ THE FULL DATE — carried forward. `Dec` under a shelf spanning years is not a date. */
  it("states the full last-sent date, not a bare month", () => {
    const body = list().slice(list().indexOf("<tbody>"), list().indexOf("</tbody>"));
    expect(body).toContain("5 Dec");
    expect(body).not.toMatch(/>Dec</);
  });

  /** A book with nothing sent has no last-sent date, and says so rather than inventing one. */
  it("dashes the last-sent date for a book never sent", () => {
    const body = list({ queries: [] }).slice(list({ queries: [] }).indexOf("<tbody>"),
                                             list({ queries: [] }).indexOf("</tbody>"));
    expect(body).toContain('<td class="msl-last">—</td>');
    /* …and the counts are still nought, which is a fact rather than an absence. */
    expect(body).toContain('<td class="msl-num">0</td>');
  });

  it("omits the word count from the byline when there is none", () => {
    expect(list({ manuscripts: [ms({ wordCount: undefined })] })).not.toContain("words");
    expect(list()).toContain("92,000 words");
  });

  /**
   * ⚠️ CARRIED FORWARD: SAGE, NOT TAN. The carousel's artwork was tan because two literals were
   * invented in a generated ref and copied out of it. The cover is the manuscripts sage pair.
   */
  it("fills the cover with the manuscripts sage pair", () => {
    expect(css).toContain("--msl-sage-a: #dce0d9");
    expect(css).toContain("--msl-sage-b: #d0d6cc");
    expect(css, "the tan pair came back").not.toContain("#e8ddd0");
  });

  /**
   * ⚠️ CARRIED FORWARD: DRAWN AS A BOOK. The inset shadow is the spine and the asymmetric radius is
   * the page edge. Without them it is a coloured rectangle, which reads as an image that failed to
   * load — exactly the defect the carousel's artwork block had.
   */
  it("draws the cover as a book, with a spine and a page edge", () => {
    const rule = css.slice(css.indexOf(".msl-cover"), css.indexOf("}", css.indexOf(".msl-cover")));
    expect(rule, "the spine shadow is gone").toContain("inset 3px 0 0");
    expect(rule, "the page-edge radius is gone").toContain("border-radius: 2px 5px 5px 2px");
  });
});

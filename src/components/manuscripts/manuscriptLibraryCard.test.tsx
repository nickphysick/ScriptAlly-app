/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the library card and the add tile.
 *
 * No jsdom in this repo (`vitest.config.ts` is `environment: 'node'`), so these render through
 * `renderToStaticMarkup` and assert against the HTML string with whole-string `toContain` — never a
 * slice, which passes against an empty string when its anchor is missing.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ManuscriptLibraryCard,
  ManuscriptLibraryCardProps,
  ManuscriptAddTile,
} from "./ManuscriptLibraryCard";
import { pitchMeter, pitchAssets } from "../../lib/manuscriptPitch";
import { Manuscript, ManuscriptStatus } from "../../types";

const FULL = pitchMeter(
  ["logline", "elevator", "blurb", "synopsis"].map((k) => ({
    key: k as any, label: k, short: k, hint: "", written: true, text: "x", readOnly: false,
  }))
);

const BASE: ManuscriptLibraryCardProps = {
  title: "Murphy's Day Out",
  status: "Querying",
  genres: ["Young Adult", "Thriller"],
  wordCount: 50000,
  logline: "Murphy catches a fly",
  stats: { queriesSent: 24, responses: 11, lastActivity: "13 Aug" },
  meter: FULL,
  onOpen: () => {},
};

const card = (over: Partial<ManuscriptLibraryCardProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptLibraryCard, { ...BASE, ...over }));

describe("the card states one book's identity", () => {
  it("renders the title, genres, word count and status", () => {
    const html = card();
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("Young Adult");
    expect(html).toContain("Thriller");
    expect(html).toContain("50,000 words");
    expect(html).toContain("Querying");
  });

  /* ⚠️ ONE CARD, ONE TAB STOP, ONE NAME. A clickable <div> wrapping a link would give the same
     book two keyboard stops and two accessible names. */
  it("is a single button carrying the whole card", () => {
    const html = card();
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Open Murphy&#x27;s Day Out"');
  });

  it("reuses the plate's status pill and genre pill classes, never a second grammar", () => {
    const html = card();
    expect(html).toContain("msv-statuspill");
    expect(html).toContain("msv-gp");
  });

  it("greys the pill and dims the card for a shelved book", () => {
    const html = card({ status: "Shelved", shelved: true });
    expect(html).toContain("msv-statuspill grey");
    expect(html).toContain("mlib-book shelved");
  });
});

describe("absence omits its clause, and zero is written only where zero is true", () => {
  it("states a missing logline rather than rendering nothing", () => {
    const html = card({ logline: undefined });
    expect(html).toContain("No logline yet");
    expect(html).toContain("mlib-logl none");
  });

  /* ⚠️ NO RESPONSES CLAUSE AT ZERO QUERIES. "0 responses" beside "no queries yet" states a second
     fact nobody asked about — and the count it reports could never have been anything else. */
  it("says 'No queries yet' ALONE when nothing has been sent", () => {
    const html = card({ stats: { queriesSent: 0, responses: 0, lastActivity: null } });
    expect(html).toContain("No queries yet");
    expect(html).not.toContain("responses");
    expect(html).not.toContain("response<");
  });

  it("states both counts once queries exist", () => {
    const html = card();
    expect(html).toContain("24");
    expect(html).toContain("queries");
    expect(html).toContain("11");
    expect(html).toContain("responses");
  });

  it("agrees in number at one", () => {
    const html = card({ stats: { queriesSent: 1, responses: 1, lastActivity: "1 Aug" } });
    expect(html).toContain("query");
    expect(html).toContain("response");
    expect(html).not.toContain("queries");
    expect(html).not.toContain("responses");
  });
});

describe("the shelf meter draws what it is given", () => {
  const ms = (over: Partial<Manuscript> = {}): Manuscript =>
    ({
      id: "m1", userId: "u", title: "T", genre: "thriller", ageCategory: "Adult",
      wordCount: 1, logline: "", comps: [],
      status: ManuscriptStatus.DRAFTING, statusChangedDate: "2026-01-01T00:00:00.000Z",
      ...over,
    } as Manuscript);

  /* ⚠️ EXTRACT THE VALUES AND COMPARE THEM IN CODE. A "count the ones without `on`" regex written
     as a lookahead matches every segment — `mlib-seg(?= |")` backtracks onto the space inside
     `mlib-seg on` and passes. That is the documented house trap, and it caught this test first. */
  it("fills a segment per written piece — four, not five", () => {
    const html = card({ meter: pitchMeter(pitchAssets(ms({ logline: "one" }), [])) });
    const segs = [...html.matchAll(/class="(mlib-seg[^"]*)"/g)].map((m) => m[1].trim());
    expect(segs, "the meter rendered no segments — the anchor is gone").not.toHaveLength(0);
    expect(segs).toHaveLength(4);
    expect(segs.filter((c) => c === "mlib-seg on")).toHaveLength(1);
    expect(segs.filter((c) => c === "mlib-seg")).toHaveLength(3);
  });

  it("renders the caption's right half only when there is one", () => {
    expect(card({ meter: FULL })).toContain("All 4 pitch pieces written");
    expect(card({ meter: FULL })).not.toContain(" to go");
    const partial = pitchMeter(pitchAssets(ms({ logline: "one" }), []));
    expect(card({ meter: partial })).toContain("3 pieces to go");
  });
});

describe("the add tile", () => {
  const tile = renderToStaticMarkup(React.createElement(ManuscriptAddTile, { onAdd: () => {} }));

  it("invites a manuscript and states a fact about the shelf, not about the writer", () => {
    expect(tile).toContain("Add a manuscript");
    expect(tile).toContain("the shelf holds more than one");
    expect(tile).not.toMatch(/\b(only|just|why not|should)\b/i);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living headers §3 — the empty page, as rendered markup: no page title (no h1) and no rule, the
 * eyebrow kept, the heading and the book-naming subline, the same two buttons, and the one quiet
 * line to a route that exists. The geometry (same boxes as the populated hero) is LH5, measured.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcEmpty } from "../queries/centre/QcEmpty";
import { ContactEmpty, discoverHintText } from "../agents/contact/ContactEmpty";

const noop = () => {};

describe("the empty page", () => {
  const qc = renderToStaticMarkup(<QcEmpty manuscriptTitle="Murphy’s Day Out" onLog={noop} onRecord={noop} onImport={noop} />);
  const cl = renderToStaticMarkup(<ContactEmpty manuscriptTitle="Murphy’s Day Out" genre="Thriller" onAdd={noop} onDiscover={noop} />);

  /* the eyebrow's section comes from the route (useMastheadSection) — present on the page, measured
     in LH5; a bare render has no route, so it is not asserted here */
  it("has no page title and no rule", () => {
    for (const h of [qc, cl]) {
      expect(h).not.toContain("<h1");
      expect(h).toContain('data-living="empty"');
      expect(h).toContain("ph--empty");
    }
  });
  it("states the situation and names the book", () => {
    expect(qc).toContain(">Nothing out yet<");
    expect(cl).toContain(">No agents on your list yet<");
    for (const h of [qc, cl]) expect(h).toContain("Murphy’s Day Out");
  });
  it("keeps the page's two buttons", () => {
    expect(qc).toContain("+ Log a query");
    expect(qc).toContain("Record a response");
    expect(cl).toContain("+ Add an agent");
    /* v12 P2 (3 Oct): the paste pill retired with the quick-add; the empty state's secondary is
       the SAME Discover pill the populated header wears */
    expect(cl).toContain("Discover agents");
    expect(cl).not.toContain("Paste a link");
  });
  it("ends on one quiet line to a route that exists — and omits it when the route cannot be taken", () => {
    expect(qc).toContain('href="/import"');
    expect(qc).toContain("Bring them in from a spreadsheet ›");
    expect(cl).toContain('href="/agents/discover"');
    expect(cl).toContain("Find agents who want thrillers ›");
    /* no Discover route: the hint line AND the secondary pill are both omitted (v12 P2) */
    const bare = renderToStaticMarkup(<ContactEmpty manuscriptTitle={null} genre={null} onAdd={noop} />);
    expect(bare).not.toContain('data-lh="hint"');
    expect(bare).not.toContain("Discover agents");
  });
  it("the genre reads as the book's own, counted where a reader counts it", () => {
    expect(discoverHintText("Thriller")).toBe("Find agents who want thrillers ›");
    expect(discoverHintText("Literary Fiction")).toBe("Find agents who want literary fiction ›");
    expect(discoverHintText("")).toBe("Find agents in Discover ›");
  });
});

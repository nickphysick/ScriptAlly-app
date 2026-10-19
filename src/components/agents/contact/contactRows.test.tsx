/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 §6 — the row: v131's table grammar in the Contact list's columns. No coloured edge for anyone
 * (v13's state edge and `rowEdge` are retired); a closed agent is marked for the grey disc; missing data is the
 * dashed add pill; the tray offers the CARD's own next step (`primaryFor`), never a ghost way-out, then Open card.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("the row: no edge, the closed mark, the add pills, and a tray whose step is the card's", async () => {
  const { ContactRows } = await import("./ContactRows");
  const agent = { id: "a1", name: "Ada Reed", agency: "Reed & Co", genres: [], mswlNotes: "" } as never;
  const facts = { agent, standing: { kind: "none" }, stand: "none", q: null, pastExpected: false, loc: null, door: "open",
    openKey: "open", statusKey: "Not queried yet", rating: null, genres: [], lastMs: null } as never;
  const html = (ghost: boolean) => renderToStaticMarkup(React.createElement(ContactRows, {
    groups: [{ label: "R", ids: ["a1"] }] as never, byId: new Map([["a1", facts]]), nowMs: 0, genreHit: () => false,
    openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
    trayFor: () => (ghost ? { label: "Open in Query Centre", act: "qc" as const, ghost: true } : { label: "Log a query", act: "log" as const }),
  }));
  it("no row carries a state edge any more (§6: no coloured row edges)", () => {
    expect(html(false)).not.toContain("data-edge");
  });
  /* RE-POINTED (v19 §C): "What they want" left the row — its wishlist and genres are the open row's strip (Part D). The
     row's own columns are now Date added, Website and Email. */
  it("v19 §C: no What they want cell; the Date added cell, and Add website / Add email where they are missing", () => {
    const h = html(false);
    expect(h).not.toContain('data-clv="dos"');
    expect(h).not.toContain("+ Add their wishlist");
    expect(h).toMatch(/data-cl19="add-website"[^>]*><span class="cl19-mt">\+ Add website<\/span>/);
    expect(h).toMatch(/data-cl19="add-email"[^>]*><span class="cl19-mt">\+ Add email<\/span>/);
    /* v19.1 §A: no icon in a missing cell */
    expect(h).not.toMatch(/data-cl19="add-(website|email)"[^>]*><svg/);
    expect(h).toContain('data-cl19="date"');
  });
  it("v19.1 §C: the date reads 12 May 2026 in one ink run; the email copies and says so", async () => {
    const withAll = { ...(facts as object), agent: { ...(agent as object), dateAdded: "2026-05-12T10:00:00.000Z", email: "ada@reed.co.uk", website: "https://www.reed.co.uk/" } } as never;
    const h = renderToStaticMarkup(React.createElement(ContactRows, {
      groups: [{ label: "R", ids: ["a1"] }] as never, byId: new Map([["a1", withAll]]), nowMs: 0, genreHit: () => false,
      openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
      trayFor: () => ({ label: "Log a query", act: "log" as const }),
    }));
    expect(h).toContain('data-cl19="date">12 May 2026</span>');
    expect(h).not.toContain("cl19-yr");
    expect(h).toMatch(/data-cl19="email" role="button" tabindex="0" title="Copy email" aria-label="Copy email ada@reed.co.uk"/);
    expect(h).toMatch(/data-cl19="website" href="https:\/\/www.reed.co.uk\/" target="_blank"/);
    expect(h).toContain(">reed.co.uk<");
    expect(h).not.toContain("cl17-ml");
  });
  /* RE-POINTED (v19.2 §B): an open agent's door goes unsaid; only a closed one says so, in rust */
  it("replies: an unstated window reads Not stated, and an open door says nothing under it", () => {
    expect(html(false)).toMatch(/<span class="clv-rrep" data-clv="rep"><b class="unk">Not stated<\/b><\/span>/);
    expect(html(false)).not.toMatch(/open to queries/i);
  });
  it("v19.2 §B: a closed agent reads Closed till {date} when it reopens, else Closed to queries", () => {
    const render = (extra: object) => renderToStaticMarkup(React.createElement(ContactRows, {
      groups: [{ label: "R", ids: ["a1"] }] as never,
      byId: new Map([["a1", { ...(facts as object), door: "closed", agent: { ...(agent as object), ...extra } } as never]]),
      nowMs: 0, genreHit: () => false, openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
      trayFor: () => ({ label: "Log a query", act: "log" as const }),
    }));
    expect(render({ reopensOn: "2026-11-01" })).toContain('<em class="cl192-shut" data-cl192="rep-closed">Closed till 1 Nov</em>');
    expect(render({})).toContain('<em class="cl192-shut" data-cl192="rep-closed">Closed to queries</em>');
  });
  /* RE-POINTED (v18.3.2 A, v18.3.3 B): there is no hover tray and no "Open card"; the row's next step lives on the open
     row's details line, which a static render never opens. v19 §D: the next step left the row entirely (the agent card
     keeps it), and lib/rowActions with it */
  it("the row is a div role=button (it holds real buttons)", () => {
    expect(html(false)).toMatch(/<div role="button" tabindex="0" class="clv-row"/);
  });
  it("a closed row renders no tray, no Open card and no next step", () => {
    for (const h of [html(false), html(true)]) {
      expect(h).not.toContain('data-cl13="tray"');
      expect(h).not.toContain("Open card");
      expect(h).not.toContain('data-cl1833="next"');
      expect(h).not.toContain("Open in Query Centre");
    }
  });
  it("a closed door with nothing queried marks the row shut (the grey disc), and says till when", () => {
    const shutFacts = { ...(facts as object), door: "closed", agent: { ...(agent as object), reopensOn: "2026-11-01" } } as never;
    const h = renderToStaticMarkup(React.createElement(ContactRows, {
      groups: [{ label: "R", ids: ["a1"] }] as never, byId: new Map([["a1", shutFacts]]), nowMs: 0, genreHit: () => false,
      openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
      trayFor: () => ({ label: "Remind me", act: "remind" as const }),
    }));
    expect(h).toMatch(/data-clv="row"[^>]*data-shut="true"/);
    expect(h).toContain("Closed till 1 Nov");
    expect(html(false)).not.toContain("data-shut");
  });
  it("the v11 Log query mini retired into the tray", () => {
    expect(html(false)).not.toContain('data-clv="mini-log"');
  });
});

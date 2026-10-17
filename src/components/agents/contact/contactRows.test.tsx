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
  it("missing wishlist and genres are the dashed add pills, saying what to add", () => {
    const h = html(false);
    expect(h).toMatch(/class="clv-miss"[^>]*data-clv="torn-wish"[^>]*>\+ Add their wishlist</);
    expect(h).toMatch(/class="clv-miss"[^>]*data-clv="torn"[^>]*>\+ Add genres</);
  });
  it("replies: an unstated window reads Not stated over the door", () => {
    expect(html(false)).toMatch(/<b class="unk">Not stated<\/b><small>Open to queries<\/small>/);
  });
  /* RE-POINTED (v18.3.2 A/B): nothing in a closed row hides on hover, and the actions live on the peek's line, which a
     static render never opens; the tray's contents and its dedupe are held by lib/rowActions.test.ts */
  it("the row is a div role=button (it holds real buttons)", () => {
    expect(html(false)).toMatch(/<div role="button" tabindex="0" class="clv-row"/);
  });
  it("a row with its peek closed renders no tray and no tray buttons", () => {
    for (const h of [html(false), html(true)]) {
      expect(h).not.toContain('data-cl13="tray"');
      expect(h).not.toContain('data-cl13="tray-act"');
      expect(h).not.toContain('data-cl13="tray-open"');
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

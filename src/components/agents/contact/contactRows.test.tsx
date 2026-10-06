/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v13 §6 — the row's state edge and its hover tray. The edge is the query's state
 * family (deep), read off the same facts the row states; the tray offers the CARD's own next step
 * (`primaryFor`), never a ghost way-out, then Open card.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { rowEdge } from "./ContactRows";
import { QueryStatus } from "../../../types";

describe("rowEdge — the 6px left edge is the query's state, deep", () => {
  const q = (court: string, status: QueryStatus) => ({ court, status }) as never;
  it("a never-queried agent has no edge, whatever their door says", () => {
    expect(rowEdge({ stand: "none" }, null)).toBe("none");
  });
  it("an offer is the offer's edge, ahead of 'your move'", () => {
    expect(rowEdge({ stand: "you" }, q("offer", QueryStatus.OFFER))).toBe("offer");
  });
  it("your move — including an agent's-court query past its date (the page's union)", () => {
    expect(rowEdge({ stand: "you" }, q("you", QueryStatus.PARTIAL_REQUESTED))).toBe("you");
    expect(rowEdge({ stand: "you" }, q("agent", QueryStatus.QUERIED))).toBe("you");
  });
  it("with the agent: Queried is sand, a later stage sage", () => {
    expect(rowEdge({ stand: "agent" }, q("agent", QueryStatus.QUERIED))).toBe("queried");
    expect(rowEdge({ stand: "agent" }, q("agent", QueryStatus.FULL_SENT))).toBe("agent");
  });
  it("closed is the closed edge", () => {
    expect(rowEdge({ stand: "closed" }, q("closed", QueryStatus.REJECTED))).toBe("closed");
  });
});

describe("the row emits its edge and a tray whose step is the card's", async () => {
  const { ContactRows } = await import("./ContactRows");
  const agent = { id: "a1", name: "Ada Reed", agency: "Reed & Co", genres: [], mswlNotes: "" } as never;
  const facts = { agent, standing: { kind: "none" }, stand: "none", q: null, pastExpected: false, loc: null, door: "open",
    openKey: "open", statusKey: "Not queried yet", rating: null, genres: [], lastMs: null } as never;
  const html = (ghost: boolean) => renderToStaticMarkup(React.createElement(ContactRows, {
    groups: [{ label: "R", ids: ["a1"] }] as never, byId: new Map([["a1", facts]]), nowMs: 0, genreHit: () => false,
    openId: null, onOpen: () => {}, onAddGenres: () => {}, onAddWishlist: () => {}, onAct: () => {},
    trayFor: () => (ghost ? { label: "Open in Query Centre", act: "qc" as const, ghost: true } : { label: "Log a query", act: "log" as const }),
  }));
  it("data-edge rides the row", () => {
    expect(html(false)).toMatch(/data-clv="row"[^>]*data-edge="none"/);
  });
  it("the row is a div role=button (it holds real buttons), and the tray's controls are buttons", () => {
    const h = html(false);
    expect(h).toMatch(/<div role="button" tabindex="0" class="clv-row"/);
    expect(h).toMatch(/<button type="button" class="clv-trb p" data-cl13="tray-act"/);
  });
  it("the tray: the step, then Open card — and no ghost way-out", () => {
    const h = html(false);
    expect(h).toContain('data-cl13="tray"');
    expect(h).toMatch(/data-cl13="tray-act"[^>]*>Log a query</);
    expect(h).toMatch(/data-cl13="tray-open"[^>]*>Open card</);
    expect(h.indexOf('data-cl13="tray-act"')).toBeLessThan(h.indexOf('data-cl13="tray-open"'));
    const g = html(true);
    expect(g).not.toContain('data-cl13="tray-act"');
    expect(g).not.toContain("Open in Query Centre");
  });
  it("the v11 Log query mini retired into the tray", () => {
    expect(html(false)).not.toContain('data-clv="mini-log"');
  });
});

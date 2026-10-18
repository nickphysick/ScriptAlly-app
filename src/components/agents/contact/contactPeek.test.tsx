/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §D — the open row is ONE strip: the genres as pills (the manuscript's fit keeps its mark), a divider,
 * then the wishlist in curly quotes. No contact details, no social handle and no next step (v18.3.3's details line is
 * retired: the contact details are the row's columns, the rest lives in the agent card).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactPeek } from "./ContactPeek";
import type { Agent } from "../../../types";

const agent = { id: "a1", name: "Theo Abara", agency: "Abara Grant", email: "theo@abaragrant.co.uk", website: "abaragrant.co.uk",
  twitter: "@theo", mswlNotes: "Suspense with heart: ordinary people pushed to the edge.", genres: ["Thriller", "Suspense"] } as unknown as Agent;
const render = (a: Agent, genres: string[]) => renderToStaticMarkup(
  React.createElement(ContactPeek, { agent: a, genres, genreHit: (g: string) => g === "Thriller", onEdit: () => undefined }));

describe("ContactPeek (v19 §D)", () => {
  const html = render(agent, ["Thriller", "Suspense"]);
  it("one strip: genres, then a divider, then the wishlist, in that order", () => {
    expect(html).toMatch(/data-cl19="strip"/);
    const g = html.indexOf('data-cl19="genres"'), d = html.indexOf("cl19-sdiv"), w = html.indexOf('data-cl19="wish"');
    expect(g).toBeGreaterThan(-1);
    expect(d).toBeGreaterThan(g);
    expect(w).toBeGreaterThan(d);
    expect(html).toContain("Suspense with heart: ordinary people pushed to the edge.");
  });
  it("a genre that fits the manuscript keeps the fit mark; the others do not", () => {
    expect(html).toMatch(/class="cl19-pill clv-hit" data-fit="true">Thriller</);
    expect(html).toMatch(/class="cl19-pill">Suspense</);
  });
  it("no contact details, no social handle and no next step in the strip", () => {
    for (const gone of ["theo@abaragrant.co.uk", "@theo", 'data-cl1833="next"', 'data-cl183="peek-pill"', "Copy email"]) expect(html).not.toContain(gone);
  });
  it("missing pieces are v14's add links", () => {
    const h = render({ ...agent, mswlNotes: "" } as Agent, []);
    expect(h).toMatch(/class="clv-miss"[^>]*data-clv="torn"[^>]*>\+ Add genres</);
    expect(h).toMatch(/class="clv-miss"[^>]*data-clv="torn-wish"[^>]*>\+ Add their wishlist</);
  });
});

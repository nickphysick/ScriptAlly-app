/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DF1-F — Dashboard feed v1, Part F: the footer. That every link renders a page (no 404) and Give feedback opens the
 * dock are measured on the running page (F1).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { F1Footer, FOOTER_COPYRIGHT, FOOTER_LINKS } from "./F1Footer";

describe("DF1-F · the footer", () => {
  const html = renderToStaticMarkup(<MemoryRouter><F1Footer /></MemoryRouter>);
  it("the links in the pack's order, less the two with no page", () => {
    expect(FOOTER_LINKS.map((l) => l.label)).toEqual(["Help centre", "What’s new", "Pricing", "About", "Contact us", "Privacy", "Terms"]);
    for (const l of FOOTER_LINKS) expect(html).toContain(`href="${l.to}"`);
    expect(html).not.toMatch(/Cookies|Follow us/);
  });
  it("Give feedback, and the copyright", () => {
    expect(html).toContain(">Give feedback<");
    expect(html).toContain(FOOTER_COPYRIGHT);
  });
});

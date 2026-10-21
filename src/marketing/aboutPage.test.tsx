/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About — the page's structural laws, asserted against RENDERED output rather than source, so a
 * class list built from a template still satisfies them. Rebuilt 21 Oct with the page
 * (ref design-refs/about-page-v1.html).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { AboutPage } from "./AboutPage";
import {
  ABOUT_VISIONS, ABOUT_PLATES, ABOUT_STATEMENT_LINES, ABOUT_GAP_HIT, ABOUT_TURN, ABOUT_SECTION_H2,
  ABOUT_CLOSE_CTA,
} from "./aboutCopy";

const html = () => renderPage(<AboutPage onNavigate={noNavigate} />, "/about");

describe("About is built from bands, not the document card", () => {
  it("does not render the document card", () => {
    expect(html()).not.toMatch(/["\s`]mk-doccard["\s`]/);
  });

  /**
   * ⚠️ THE WHOLE ATTRIBUTE, NEVER A PREFIX. Splitting on `class="mk-band` also splits on
   * `class="mk-bandcopy"`. After `mk-band` the pattern demands the closing quote or a ` mk-band--`
   * modifier, and `copy"` is neither.
   */
  it("renders one band per vision and pulls the copy across on exactly the middle one", () => {
    const bands = [...html().matchAll(/class="(mk-band(?: mk-band--[a-z]+)*)"/g)].map((m) => m[1]);
    expect(bands.length).toBe(ABOUT_VISIONS.length);
    expect(bands).toEqual(["mk-band mk-band--first", "mk-band mk-band--copyfirst", "mk-band"]);
  });

  /**
   * The order is the argument: the aim, the gap on navy, the method header, the three visions, the
   * founder's note, the way out. The section header sits between the gap and the first band, which
   * is also what keeps `.mk-band + .mk-band`'s hairline off the first band.
   */
  it("opens with the aim, then the gap, then the method, the visions, the note and the close", () => {
    const page = html();
    const order = ["mk-ahero", "mk-agap", "mk-sechead", "mk-band mk-band--first", "mk-note", "mk-aclose"]
      .map((c) => page.indexOf(`class="${c}`));
    for (const at of order) expect(at).toBeGreaterThanOrEqual(0);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("states the aim on three explicit lines, the hit line, the turn and the method header", () => {
    const page = html();
    for (const line of ABOUT_STATEMENT_LINES) expect(page).toContain(`<span class="mk-astl">${line}</span>`);
    expect(page).toContain(ABOUT_GAP_HIT);
    expect(page).toContain(ABOUT_TURN.replace("'", "&#x27;"));
    expect(page).toContain(ABOUT_SECTION_H2);
  });

  it("draws the hero drawing as a real image with real alt text", () => {
    expect(html()).toMatch(/<img class="mk-aheroart"[^>]*alt="An older hawk reading aloud/);
  });
});

describe("every illustration slot carries its brief", () => {
  /**
   * The slots ship as placeholders so nothing shifts when the art lands, and each one carries the
   * illustrator's brief on the element — the brief travels with the slot rather than living in a
   * document nobody opens.
   */
  it("reserves a slot for each vision and for the founder, each with a caption and a brief", () => {
    const page = html();
    for (const slot of [...ABOUT_VISIONS.map((v) => v.key), "founder"] as const) {
      const plate = ABOUT_PLATES[slot];
      expect(page).toContain(`data-illo="${slot}"`);
      expect(plate.brief.length).toBeGreaterThan(40);
      expect(page).toContain(plate.caption.replace("'", "&#x27;"));
    }
  });

  it("does not draw the retired dashed-rim primitive", () => {
    expect(html()).not.toMatch(/["\s`]mk-illo["\s`]/);
  });
});

describe("the three promises are gone, and vision 03 holds the data promise alone", () => {
  it("renders no commitment strip", () => {
    expect(html()).not.toMatch(/["\s`]mk-commitstrip["\s`]/);
  });

  it("states that nothing is sold, shown adverts, trained on, or written for the writer", () => {
    const body = (ABOUT_VISIONS.find((v) => v.key === "time")!.body as string[]).join("");
    expect(body).toMatch(/won't sell them/);
    expect(body).toMatch(/train AI/);
    expect(body).toMatch(/won't try to write for\s+you/);
  });
});

describe("the founder's note and the sign-off", () => {
  /**
   * ⚠️ THE HAIRLINE IS ITS OWN ELEMENT — never a border or a pseudo-element on either label, which
   * would drift the moment either label's length changed. `IdentityLine` carries the same law.
   */
  it("draws the rule as a sibling element", () => {
    expect(html()).toMatch(/["\s`]mk-signrule["\s`]/);
  });

  it("names the role and the person separately, and offers a way to say hello", () => {
    const page = html();
    expect(page).toContain("Nick Physick");
    expect(page).toContain("Founder");
    expect(page).toContain("Say hello");
  });

  it("closes on the founding-writer offer", () => {
    expect(html()).toContain(ABOUT_CLOSE_CTA);
  });
});

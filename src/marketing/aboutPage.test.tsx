/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About — the page's structural laws, asserted against RENDERED output rather than source, so a
 * class list built from a template still satisfies them.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { AboutPage } from "./AboutPage";
import { ABOUT_COMMITMENTS, ABOUT_VISIONS } from "./aboutCopy";

const html = () => renderPage(<AboutPage onNavigate={noNavigate} />, "/about");

describe("About is built from bands, not the document card", () => {
  /**
   * ⚠️ THE TWO SHAPES ARE DELIBERATELY DIFFERENT. `DocumentShell` is the legal tier's reading
   * column; About is a page read once. If this page ever renders inside the card, three short
   * sections start looking like a contract.
   */
  it("does not render the document card", () => {
    expect(html()).not.toMatch(/["\s`]mk-doccard["\s`]/);
  });

  it("renders one band per vision, plus the hero", () => {
    const bands = html().match(/class="mk-band(?![a-z-])/g) ?? [];
    expect(bands.length).toBe(ABOUT_VISIONS.length + 1);
  });

  /**
   * ⚠️ THE ALTERNATION IS A CLASS, AND THIS ASSERTS THE CLASS — the pixels were measured in the
   * browser at 1280 (bands landed at copy 106 / plate 663 and back again). The first attempt put
   * the flip modifier on the bands whose DOM order already agreed with it, so the rule was a
   * no-op and all three visions drew their plate on the left through a green suite. A source lock
   * cannot see that; it can only stop the class drifting off the band it was measured on.
   */
  it("pulls the copy across on exactly the middle vision", () => {
    /* ⚠️ THE WHOLE ATTRIBUTE, NEVER A PREFIX. Splitting on `class="mk-band` also splits on
       `class="mk-bandcopy"` — it found eight bands in a page that has four. */
    const bands = [...html().matchAll(/class="(mk-band(?: mk-band--copyfirst)?)"/g)].map((m) => m[1]);
    expect(bands.length).toBe(ABOUT_VISIONS.length + 1);
    // Band 0 is the hero (its copy is already first in the markup); the visions follow.
    expect(bands.slice(1)).toEqual(["mk-band", "mk-band mk-band--copyfirst", "mk-band"]);
  });

  /**
   * Every band carries its illustration slot, so no slot is silently dropped by a copy edit.
   * ⚠️ RETARGET, SAME LAW: the hero slot is now keyed `mission` — one primitive serves both public
   * pages, so the key names which panel it is rather than where it sits. The claim is unchanged
   * (every band reserves its plate) and it is still read off rendered output.
   */
  it("reserves an illustration slot in each band", () => {
    const page = html();
    for (const slot of ["mission", ...ABOUT_VISIONS.map((v) => v.key)]) {
      expect(page).toContain(`data-illo="${slot}"`);
    }
  });
});

describe("the commitments say what the product is asserted to do elsewhere", () => {
  /**
   * ⚠️ THESE ARE PRODUCT LAW, NOT MARKETING. "It reports; it never appraises" is enforced in code
   * across the app. A commitment softened here would put the shop window at odds with the product.
   */
  it("states all three, in full", () => {
    const page = html();
    for (const commitment of ABOUT_COMMITMENTS) {
      expect(page).toContain(commitment.heading);
    }
  });

  it("keeps the no-appraisal promise on the page", () => {
    expect(html()).toContain("It reports; it never appraises.");
  });
});

describe("the founder sign-off follows the identity-line law", () => {
  /**
   * ⚠️ THE HAIRLINE IS ITS OWN ELEMENT — never a border or a pseudo-element on either label, which
   * would drift the moment either label's length changed. `IdentityLine` carries the same law and
   * the same reasoning; it is not imported here because it takes an agent and pulls a workspace
   * lib into a tier that states it makes no workspace imports.
   */
  it("draws the rule as a sibling element", () => {
    expect(html()).toMatch(/["\s`]mk-signrule["\s`]/);
  });

  it("names the role and the person separately", () => {
    const page = html();
    expect(page).toContain("Nick Physick");
    expect(page).toContain("Founder");
  });
});

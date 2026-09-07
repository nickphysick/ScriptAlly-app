/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the 3D flip's STRUCTURAL rules. Deliberately an artefact (CSS-text) test: violating any
 * of these silently mirrors the back face, and jsdom cannot evaluate a 3D transform — so the only
 * automated guard available is the stylesheet itself. Nick's browser pass confirms the motion.
 *
 * The five rules: rotate exactly ONE element · preserve-3d on it · NO overflow property on it (any
 * value flattens the 3D context) · backface-visibility:hidden on the two direct face children ·
 * the back face pre-rotated 180°.
 *
 * Every assertion below carries a message naming the CONSEQUENCE, not the rule — a future reader
 * seeing this suite go red should learn what breaks on screen, not just which line moved.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8");
const block = (selector: string): string => {
  const i = css.indexOf(selector + " {");
  if (i === -1) return "";
  return css.slice(i, css.indexOf("}", i));
};

describe("agent list · 3D flip structural rules", () => {
  it("the rotor is the one rotating element, and it carries preserve-3d", () => {
    expect(
      block(".aglist .agl-rotor"),
      "the rotor lost `transform-style: preserve-3d` — its children flatten into the parent plane, so the editor face renders on top of the card face instead of behind it and the flip reads as a cross-fade",
    ).toContain("transform-style: preserve-3d");
    expect(
      css,
      "the rotor is no longer the element that rotates — rotating a face instead of the rotor spins that face inside a static parent, so the two faces separate mid-turn",
    ).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg)");
  });

  it("the rotor has NO overflow property — any value flattens 3D", () => {
    expect(
      block(".aglist .agl-rotor"),
      "an `overflow` declaration reached the rotor — ANY value (even `visible`) forces a flat rendering context, and the back face appears mirror-imaged with its text reversed",
    ).not.toMatch(/overflow/);
  });

  it("both direct face children hide their back face", () => {
    expect(
      block(".aglist .agl-facef"),
      "the card face stopped hiding its back — it stays visible through the editor after the flip, so both faces show at once",
    ).toContain("backface-visibility: hidden");
    expect(
      block(".aglist .agl-faceb"),
      "the editor face stopped hiding its back — it bleeds through the resting card as mirrored text",
    ).toContain("backface-visibility: hidden");
  });

  it("the back face is pre-rotated 180deg", () => {
    expect(
      block(".aglist .agl-faceb"),
      "the editor face lost its 180° pre-rotation — the rotor's turn leaves it facing away, so a flipped card shows a blank back",
    ).toContain("transform: rotateY(180deg)");
  });

  /* ⚠️ RETARGETED (Phase 4), AND THE PAIR IS DELIBERATELY HALF ITS FORMER SIZE. The rotor grew to
     580px on flip because the back face held an EDITOR; it holds the contact peek now — five rows
     and a button — which fits inside the front's own 400. What is asserted is the law that made
     the pair worth locking in the first place: the rotor has ONE height, so turning a card over
     cannot change the grid row's height under the reader's pointer. */
  it("the rotor has ONE height — turning a card over never resizes its row", () => {
    const rest = /\.aglist \.agl-rotor \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rest, "the rotor's own rule is gone").not.toBe("");
    expect(rest).toContain("height: 400px");
    const flipped = /\.aglist \.agl-rotor\.flipped \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(flipped, "the flipped rule is gone").not.toBe("");
    expect(flipped, "the flipped rotor took a height again — the row will jump as the card turns").not.toContain("height");
    expect(flipped).toContain("rotateY(180deg)");
  });

  /* the face was the editor's; it is the peek's now, and the law is unchanged — a dimmed card
     must not hand you a half-faded set of contact details to read */
  it("the BACK face never fades, even on a dimmed card", () => {
    expect(
      css,
      "the closed-agent fade reached the editor face — editing a closed agent would happen at 62% opacity, reading as a disabled form the writer can nonetheless type into",
    ).toContain(".aglist .agl-faceb .agl-acard { opacity: 1 !important; }");
  });
});

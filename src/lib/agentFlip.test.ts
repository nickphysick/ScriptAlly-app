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

  it("fixed heights are CSS-driven: 400 resting, 580 flipped", () => {
    expect(
      block(".aglist .agl-rotor"),
      "the resting height left the stylesheet — absolutely-positioned faces have no height of their own, so the rotor collapses and the grid row closes over the card",
    ).toContain("height: 400px");
    expect(
      css,
      "the flipped height left the stylesheet — the editor's four tabs and pinned composer are then clipped by a 400px rotor",
    ).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg); height: 580px; }");
  });

  it("the editor face never fades, even on a closed (grey) agent", () => {
    expect(
      css,
      "the closed-agent fade reached the editor face — editing a closed agent would happen at 62% opacity, reading as a disabled form the writer can nonetheless type into",
    ).toContain(".aglist .agl-faceb .agl-acard { opacity: 1 !important; }");
  });
});

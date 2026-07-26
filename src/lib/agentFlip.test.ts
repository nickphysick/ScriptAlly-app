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
    expect(block(".aglist .agl-rotor")).toContain("transform-style: preserve-3d");
    expect(css).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg)");
  });

  it("the rotor has NO overflow property — any value flattens 3D", () => {
    expect(block(".aglist .agl-rotor")).not.toMatch(/overflow/);
  });

  it("both direct face children hide their back face", () => {
    expect(block(".aglist .agl-facef")).toContain("backface-visibility: hidden");
    expect(block(".aglist .agl-faceb")).toContain("backface-visibility: hidden");
  });

  it("the back face is pre-rotated 180deg", () => {
    expect(block(".aglist .agl-faceb")).toContain("transform: rotateY(180deg)");
  });

  it("fixed heights are CSS-driven: 400 resting, 580 flipped", () => {
    expect(block(".aglist .agl-rotor")).toContain("height: 400px");
    expect(css).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg); height: 580px; }");
  });

  it("the editor face never fades, even on a closed (grey) agent", () => {
    expect(css).toContain(".aglist .agl-faceb .agl-acard { opacity: 1 !important; }");
  });
});

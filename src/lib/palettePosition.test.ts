/**
 * Locks for the palette dropdown's positioning maths (polish §2).
 *
 * ⚠️ VIEWPORT SAFETY IS THE WHOLE POINT. The palette was a centred modal, which is on screen by
 * construction; a dropdown right-aligned to a pill is not. Every fixture below is a way the
 * dropdown could end up partly off screen, and a search box whose start you cannot see is worse
 * than the modal it replaced.
 *
 * The RENDERING is a browser check; "does it stay on screen at 320px" should not be.
 */
import { describe, it, expect } from "vitest";
import {
  PALETTE_EDGE, PALETTE_GAP, PALETTE_MAX_LIST, PALETTE_MAX_W, palettePosition,
} from "./palettePosition";

/** A pill at the right of a roomy window — the ordinary case. */
const pill = { left: 1100, right: 1310, bottom: 60 };

describe("the ordinary case — right-aligned under the pill", () => {
  it("sits 8px below the pill", () => {
    expect(palettePosition(pill, 1440, 900).top).toBe(60 + PALETTE_GAP);
  });

  it("takes the max width when there is room", () => {
    expect(palettePosition(pill, 1440, 900).width).toBe(PALETTE_MAX_W);
  });

  it("aligns its right edge to the pill's", () => {
    const b = palettePosition(pill, 1440, 900);
    expect(b.left + b.width).toBe(pill.right);
  });

  it("caps the list at 340 when the window is tall", () => {
    expect(palettePosition(pill, 1440, 900).maxListHeight).toBe(PALETTE_MAX_LIST);
  });
});

describe("narrow viewports — the case this function exists for", () => {
  /* ⚠️ THE FIXTURE. At 360px a 560-wide dropdown right-aligned to a pill at x=340 would start at
     −220: the input, the first result and the whole left half of every row would be off screen. */
  it("never starts left of the 12px edge", () => {
    const b = palettePosition({ left: 150, right: 340, bottom: 56 }, 360, 640);
    expect(b.left).toBe(PALETTE_EDGE);
  });

  it("shrinks to fit rather than overflowing", () => {
    const b = palettePosition({ left: 150, right: 340, bottom: 56 }, 360, 640);
    expect(b.width).toBe(360 - PALETTE_EDGE * 2);
    expect(b.left + b.width).toBeLessThanOrEqual(360 - PALETTE_EDGE);
  });

  it("stays inside both edges at a range of widths", () => {
    for (const vw of [320, 360, 480, 600, 768, 1024, 1440, 2560]) {
      const b = palettePosition({ left: vw - 210, right: vw - 20, bottom: 60 }, vw, 900);
      expect(b.left, `left at ${vw}`).toBeGreaterThanOrEqual(PALETTE_EDGE);
      expect(b.left + b.width, `right at ${vw}`).toBeLessThanOrEqual(vw - PALETTE_EDGE);
    }
  });

  /* An anchor sitting past the right edge (a wide bar in a narrow window) would push a
     right-aligned dropdown out on the OTHER side — the clamp the pass does not name, but which
     the same bug produces mirrored. */
  it("clamps the right edge too, when the anchor is off to the right", () => {
    const b = palettePosition({ left: 900, right: 1100, bottom: 60 }, 700, 900);
    expect(b.left + b.width).toBeLessThanOrEqual(700 - PALETTE_EDGE);
  });
});

describe("short viewports — the list must not run off the bottom", () => {
  it("caps the list to the room actually below the pill", () => {
    const b = palettePosition({ left: 300, right: 500, bottom: 400 }, 1024, 600);
    expect(b.maxListHeight).toBe(600 - (400 + PALETTE_GAP) - 16);
    expect(b.maxListHeight).toBeLessThan(PALETTE_MAX_LIST);
  });

  /* ⚠️ NEVER NEGATIVE. `max-height:-40px` is IGNORED by the browser — the list would render at
     full height and run straight off the bottom, which is the exact failure the cap prevents. */
  it("floors at zero rather than going negative", () => {
    const b = palettePosition({ left: 300, right: 500, bottom: 700 }, 1024, 600);
    expect(b.maxListHeight).toBe(0);
    expect(b.maxListHeight).toBeGreaterThanOrEqual(0);
  });
});

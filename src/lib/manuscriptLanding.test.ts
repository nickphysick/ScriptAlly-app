/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { landingTarget } from "./manuscriptLanding";

const only = () => "ms-1";

describe("where /manuscripts lands", () => {
  it("opens the book when there is exactly one and no param", () => {
    expect(landingTarget({ count: 1, param: null, alreadyLanded: false }, only)).toBe("ms-1");
  });

  /** ⚠️ At zero there is nothing to open; at two or more there is a choice, and choosing for the
   *  writer is worse than showing them the list. */
  it("shows the list at zero and at two or more", () => {
    expect(landingTarget({ count: 0, param: null, alreadyLanded: false }, only)).toBeNull();
    expect(landingTarget({ count: 2, param: null, alreadyLanded: false }, only)).toBeNull();
    expect(landingTarget({ count: 9, param: null, alreadyLanded: false }, only)).toBeNull();
  });

  /** A param is an explicit request and always wins. */
  it("never redirects when a param is present", () => {
    expect(landingTarget({ count: 1, param: "ms-1", alreadyLanded: false }, only)).toBeNull();
    expect(landingTarget({ count: 1, param: "ms-other", alreadyLanded: false }, only)).toBeNull();
  });

  /**
   * ⚠️ THE ROUND TRIP, WHICH IS THE POINT OF THE LATCH. `← All manuscripts` navigates to the bare
   * path; without the latch this call returns the book again and the control is unusable at one
   * manuscript — working perfectly and looking inert, the Query Centre fault exactly.
   */
  it("leaves the list reachable once the reader has left the book", () => {
    /* 1. arrive → land on the book */
    expect(landingTarget({ count: 1, param: null, alreadyLanded: false }, only)).toBe("ms-1");
    /* 2. the caller latches, the reader reads the book */
    expect(landingTarget({ count: 1, param: "ms-1", alreadyLanded: true }, only)).toBeNull();
    /* 3. ← All manuscripts → the bare path → and the LIST stays. */
    expect(landingTarget({ count: 1, param: null, alreadyLanded: true }, only),
      "the departure bounced straight back into the book").toBeNull();
  });

  /** A shelf whose one manuscript cannot be resolved shows the list rather than navigating to nothing. */
  it("shows the list when the only id cannot be resolved", () => {
    expect(landingTarget({ count: 1, param: null, alreadyLanded: false }, () => null)).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   AND THE PAGE ACTUALLY USES IT — the half a pure test cannot make.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("the page wires the landing decision", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const src = strip(readFileSync(join(__dirname, "../components/AllManuscripts.tsx"), "utf8"));

  it("calls landingTarget rather than deciding for itself", () => {
    expect(src).toContain("landingTarget(");
    expect(src, "the page grew its own one-manuscript branch")
      .not.toMatch(/manuscripts\.length === 1\s*&&/);
  });

  /**
   * ⚠️ THE LATCH IS SET WHERE IT IS ACTED ON. Latching anywhere else — on mount, or in a cleanup —
   * either blocks the first land or never fires, and both look like the redirect simply not working.
   */
  it("latches at the moment it navigates", () => {
    const effect = src.slice(src.indexOf("const landedRef"), src.indexOf("const selected"));
    expect(effect).not.toBe("");
    expect(effect.indexOf("landedRef.current = true")).toBeLessThan(effect.indexOf("navigate("));
  });

  /** ⚠️ `replace`, so the shelf the reader never saw is not left in history to bounce them forward. */
  it("replaces rather than pushes", () => {
    expect(src).toContain("{ replace: true }");
  });
});

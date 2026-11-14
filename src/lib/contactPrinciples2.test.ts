/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { BRAND_RING } from "./contactPrinciples2";
import { healthColours, NAVY_RING } from "../components/agents/contact/ContactHealth26";

describe("principles v2 — the List health ring in brand colours", () => {
  it("navy arc, soft pink track at every score on the light ground (it no longer follows the score)", () => {
    for (let p = 0; p <= 100; p++) expect(healthColours(p, "light")).toEqual({ arc: "#2a3a52", track: "#ecc0ae" });
    expect(BRAND_RING).toEqual({ arc: "#2a3a52", track: "#ecc0ae" });
  });
});

describe("QC layout v1 — the List health ring on the navy", () => {
  it("a cream arc over the soft pink at 55%, at every score (v26's green, amber and red on navy are retired)", () => {
    for (let p = 0; p <= 100; p++) expect(healthColours(p, "navy")).toEqual({ arc: "#f4eee5", track: "rgba(232, 189, 180, 0.55)" });
    expect(NAVY_RING).toEqual({ arc: "#f4eee5", track: "rgba(232, 189, 180, 0.55)" });
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { BRAND_RING, NUDGE_CLEAR, NUDGE_INSET, healthNudge } from "./contactPrinciples2";
import { healthColours } from "../components/agents/contact/ContactHealth26";

describe("principles v2 — the List health ring in brand colours", () => {
  it("navy arc, soft pink track at every score on the light ground (it no longer follows the score)", () => {
    for (let p = 0; p <= 100; p++) expect(healthColours(p, "light")).toEqual({ arc: "#2a3a52", track: "#ecc0ae" });
    expect(BRAND_RING).toEqual({ arc: "#2a3a52", track: "#ecc0ae" });
  });
});

describe("principles v2 — List health nudged in (healthNudge)", () => {
  /* 1440 as built (R0-base.json): block 1079.5–1400, frame right 1390, headline text ends 911.6 */
  const at1440 = { blockL: 1079.5, blockR: 1400, frameR: 1390, inkR: 911.6, stacked: false };
  it("pulls the block to 32px inside the frame's right edge — 42px, since it overhangs by 10", () => {
    const n = healthNudge(at1440);
    expect(n).toBe(42);
    expect(at1440.frameR - (at1440.blockR - n)).toBe(NUDGE_INSET);
  });
  it("never nearer the headline's text than 24px: the nudge shrinks instead", () => {
    const tight = { ...at1440, inkR: 1079.5 - 30 };
    const n = healthNudge(tight);
    expect(n).toBe(6);
    expect(tight.blockL - n - tight.inkR).toBe(NUDGE_CLEAR);
  });
  it("no room at all: no nudge, never a push to the right", () => {
    expect(healthNudge({ ...at1440, inkR: 1079.5 - 10 })).toBe(0);
    expect(healthNudge({ ...at1440, frameR: 1500 })).toBe(0);
  });
  it("stacked: none", () => expect(healthNudge({ ...at1440, stacked: true })).toBe(0));
  it("no frame drawn: the plain 32px", () => expect(healthNudge({ ...at1440, frameR: null })).toBe(32));
});

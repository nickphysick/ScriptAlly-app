/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the agent-photo guards + crop maths. The canvas pipeline itself needs a real browser
 * (flagged for Nick's browser pass); what's tested here is everything pure: the 10MB source
 * ceiling, the image-type guard, and the centre-crop box for landscape / portrait / square.
 */
import { describe, it, expect } from "vitest";
import { centreCrop, checkSource, MAX_SOURCE_BYTES, OUTPUT_EDGE, OUTPUT_QUALITY } from "./agentImage";

describe("agentImage · source guards", () => {
  it("rejects over 10MB BEFORE any decoding", () => {
    const err = checkSource({ size: MAX_SOURCE_BYTES + 1, type: "image/jpeg" });
    expect(err?.reason).toBe("too-large");
    expect(err?.message).toMatch(/10MB/);
  });
  it("accepts exactly 10MB", () => {
    expect(checkSource({ size: MAX_SOURCE_BYTES, type: "image/png" })).toBeNull();
  });
  it("rejects non-images", () => {
    expect(checkSource({ size: 1000, type: "application/pdf" })?.reason).toBe("not-an-image");
    expect(checkSource({ size: 1000, type: "" })?.reason).toBe("not-an-image");
  });
});

describe("agentImage · centre crop", () => {
  it("landscape crops the middle square", () => {
    expect(centreCrop(1000, 400)).toEqual({ sx: 300, sy: 0, size: 400 });
  });
  it("portrait crops the middle square", () => {
    expect(centreCrop(400, 1000)).toEqual({ sx: 0, sy: 300, size: 400 });
  });
  it("a square is untouched", () => {
    expect(centreCrop(512, 512)).toEqual({ sx: 0, sy: 0, size: 512 });
  });
  it("degenerate sizes don't produce a negative box", () => {
    expect(centreCrop(0, 100)).toEqual({ sx: 0, sy: 50, size: 0 });
  });
});

describe("agentImage · output contract", () => {
  it("256×256 at q0.82 — the ~15–30KB target", () => {
    expect(OUTPUT_EDGE).toBe(256);
    expect(OUTPUT_QUALITY).toBe(0.82);
  });
});

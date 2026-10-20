/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 §D — a glyph per status, so no two Status groups (or their jump buttons) draw the same mark.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { bandArtOf, stageKeyOfStatus } from "./qcBandArt";

describe("stageKeyOfStatus", () => {
  it("gives every status a glyph of its own", () => {
    const all = Object.values(QueryStatus) as string[];
    const keys = all.map(stageKeyOfStatus);
    expect(new Set(keys).size).toBe(all.length);
  });
  it("No response is the dashed clock, no longer Passed's circle-with-a-line", () => {
    expect(stageKeyOfStatus(QueryStatus.NO_RESPONSE)).toBe("nr");
    expect(stageKeyOfStatus(QueryStatus.REJECTED)).toBe("cl");
  });
  it("the Status band draws the same glyph the jump button does", () => {
    const a = bandArtOf("status", QueryStatus.NO_RESPONSE);
    expect(a && a.kind === "glyph" && a.glyph).toBe("nr");
  });
});

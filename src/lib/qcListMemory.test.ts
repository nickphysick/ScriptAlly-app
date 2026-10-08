/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC132 §4 — the list's memory: versioned, validated, density only.
 */
import { describe, it, expect } from "vitest";
import { QC_LIST_MEMORY_KEY, parseQcListMemory, serialiseQcListMemory } from "./qcListMemory";

describe("the Query Centre list's memory", () => {
  it("round-trips density under a versioned key", () => {
    expect(QC_LIST_MEMORY_KEY).toBe("sa.qcList.v1");
    expect(parseQcListMemory(serialiseQcListMemory({ density: "compact" }))).toEqual({ density: "compact" });
  });
  it("nothing stored, junk, or another version: the defaults", () => {
    for (const raw of [null, "", "{", "null", JSON.stringify({ density: "compact" }), JSON.stringify({ v: 2, density: "compact" })]) {
      expect(parseQcListMemory(raw), String(raw)).toEqual({ density: "comfortable" });
    }
  });
  it("a junk field reads as its default", () => {
    expect(parseQcListMemory(JSON.stringify({ v: 1, density: "huge" }))).toEqual({ density: "comfortable" });
  });
});

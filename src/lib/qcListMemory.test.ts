/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC132 §4 — the list's memory: versioned, validated, density and the grouping.
 */
import { describe, it, expect } from "vitest";
import { QC_LIST_DEFAULTS, QC_LIST_MEMORY_KEY, parseQcListMemory, serialiseQcListMemory } from "./qcListMemory";

describe("the Query Centre list's memory", () => {
  it("round-trips density and the grouping under a versioned key", () => {
    expect(QC_LIST_MEMORY_KEY).toBe("sa.qcList.v1");
    expect(parseQcListMemory(serialiseQcListMemory({ density: "compact", group: "none" }))).toEqual({ density: "compact", group: "none" });
  });
  it("the default grouping is Urgency", () => {
    expect(QC_LIST_DEFAULTS).toEqual({ density: "comfortable", group: "attention" });
  });
  it("nothing stored, junk, or another version (version 1 included): the defaults", () => {
    for (const raw of [null, "", "{", "null", JSON.stringify({ density: "compact" }), JSON.stringify({ v: 1, density: "compact" }), JSON.stringify({ v: 3, density: "compact", group: "none" })]) {
      expect(parseQcListMemory(raw), String(raw)).toEqual(QC_LIST_DEFAULTS);
    }
  });
  it("a junk field reads as its default", () => {
    expect(parseQcListMemory(JSON.stringify({ v: 2, density: "huge", group: "colour" }))).toEqual(QC_LIST_DEFAULTS);
    expect(parseQcListMemory(JSON.stringify({ v: 2, density: "compact", group: "colour" }))).toEqual({ density: "compact", group: "attention" });
  });
});

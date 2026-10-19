/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140.1 §A — the Filters menu's export label: "all {N}" with nothing narrowing the list, "{v}" otherwise,
 * singular at one. (The button's disabled state at 0 and the exported rows are measured on the page: QC1401 A1/A2.)
 */
import { describe, it, expect } from "vitest";
import { exportLabel } from "./qc140";

describe("v140.1 export label", () => {
  it("names every query while nothing narrows the list", () => {
    expect(exportLabel(87, 87, false)).toBe("↓ Export all 87 queries");
    expect(exportLabel(1, 1, false)).toBe("↓ Export all 1 query");
  });
  it("names what the list shows once something narrows it", () => {
    expect(exportLabel(12, 87, true)).toBe("↓ Export 12 queries");
    expect(exportLabel(1, 87, true)).toBe("↓ Export 1 query");
    expect(exportLabel(0, 87, true)).toBe("↓ Export 0 queries");
  });
  it("a search that matches everything still counts as narrowing", () => {
    expect(exportLabel(87, 87, true)).toBe("↓ Export 87 queries");
  });
});

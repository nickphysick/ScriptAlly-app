/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v142 §D — the Cards view's pure parts. The rendered card is locked by tests/e2e/qcV142.measure.ts (L5);
 * these hold the words the card derives.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CARD_TONE, packageChip } from "./QcCards142";

describe("v142 §D — the card's package chip", () => {
  it("names the package, adds 'package' once, and says NO PACKAGE when none went", () => {
    expect(packageChip("Light")).toBe("LIGHT PACKAGE");
    expect(packageChip("Short · 10 pages")).toBe("SHORT · 10 PAGES PACKAGE");
    expect(packageChip("Agency package")).toBe("AGENCY PACKAGE");
    expect(packageChip(null)).toBe("NO PACKAGE");
  });
});

describe("v142 §D — the band's four tones", () => {
  it("are the landing card's three and a striped Gone quiet", () => {
    expect(CARD_TONE.you).toEqual({ bg: "#f5e6df", fg: "#7c3a2a", pill: "#f5e6df" });
    expect(CARD_TONE.agent).toEqual({ bg: "#e2e6e0", fg: "#4d524a", pill: "#e6e9e4" });
    expect(CARD_TONE.closed).toEqual({ bg: "#e4e1db", fg: "#5b524a", pill: "#ece8e3" });
    expect(CARD_TONE.quiet.bg).toBe("repeating-linear-gradient(135deg, #ebe6dd 0 6px, #f3efe8 6px 12px)");
    expect(CARD_TONE.quiet.fg).toBe("#6b5f52");
  });
});

describe("v142 §D — the card is the landing card's markup, and the marketing tier is only read", () => {
  const src = readFileSync("src/components/queries/centre/QcCards142.tsx", "utf8");
  it("imports heroCard.css and builds the card from its .mk-lc classes", () => {
    expect(src).toMatch(/import "\.\.\/\.\.\/\.\.\/marketing\/heroCard\.css";/);
    for (const c of ["mk-lc", "mk-lc-in", "mk-lc-band", "mk-lc-agent", "mk-lc-nm", "mk-lc-pill", "mk-lc-ms", "mk-lc-tabs", "mk-lc-steps", "mk-lc-ft"]) {
      expect(src, c).toMatch(new RegExp(`["\\s]${c}["\\s]`));
    }
  });
});

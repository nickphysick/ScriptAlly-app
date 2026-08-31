import { describe, it, expect } from "vitest";
import { fitLabel, fitLines, FIT_PAD_LONG, FIT_PAD_SHORT } from "./barFit";

describe("⚠️ the fit pass: long, then short, then bare", () => {
  it("takes the long form when it clears the bar by its pad", () => {
    expect(fitLabel(200, 200 - FIT_PAD_LONG, 40)).toBe("long");
    expect(fitLabel(200, 100, 40)).toBe("long");
  });

  /**
   * ⚠️ THIS IS THE BRANCH THE REAL BOARD NEVER EXERCISES, which is why it is asserted here. The
   * harness account's bars are either ~600px or exactly 28px — a whole stretch or a single day —
   * so nothing on it is the width at which the short form is the answer. Unexercised is not the
   * same as dead, and only a check that does not need a fixture can tell the two apart.
   */
  it("falls back to the short form in the band between them", () => {
    expect(fitLabel(120, 200, 90)).toBe("short");
    expect(fitLabel(90 + FIT_PAD_SHORT, 200, 90)).toBe("short");
  });

  it("goes bare rather than truncating, and bare is the only third answer", () => {
    expect(fitLabel(50, 200, 90)).toBe("bare");
    /* one pixel short of the short form is bare, not a cut-down short form */
    expect(fitLabel(90 + FIT_PAD_SHORT - 1, 200, 90)).toBe("bare");
    /* ⚠️ AND A BAR WITH NO SHORT FORM SKIPS STRAIGHT TO BARE. Some states have no shorter true
       wording; inventing one would be a second phrasing to keep true. */
    expect(fitLabel(120, 200, null)).toBe("bare");
    expect(fitLabel(300, 200, null)).toBe("long");
  });

  it("⚠️ the long form is asked for MORE room than the short one", () => {
    /* a bar that only just holds its long form is worse than one that comfortably holds its
       short, so the two pads differ and the order is the claim */
    expect(FIT_PAD_LONG).toBeGreaterThan(FIT_PAD_SHORT);
  });

  it("the boundaries are exact — a fit is `>=`, so equality fits", () => {
    expect(fitLabel(126, 100, 60)).toBe("long");
    expect(fitLabel(125, 100, 60)).toBe("short");
    expect(fitLabel(82, 100, 60)).toBe("short");
    expect(fitLabel(81, 100, 60)).toBe("bare");
  });
});

/* ══ TWO LINES (v37, Phase 6) ══════════════════════════════════════════════════════════════ */

describe("two lines drop in a stated order", () => {
  /* widths chosen so each branch is the ONLY one that could be returned — a case that would pass
     under two different rules is not evidence about which rule is in force */
  it("both lines where both clear the pad", () => {
    expect(fitLines(200, 100, 80)).toBe("both");
  });

  it("line two drops first — line one survives a bar that cannot hold both", () => {
    /* line one clears its pad (120 >= 90 + 26); line two does not (120 < 100 + 26) */
    expect(fitLines(120, 90, 100)).toBe("one");
  });

  it("no second line at all is ONE, not bare", () => {
    expect(fitLines(200, 100, null)).toBe("one");
    expect(fitLines(200, 100, 0)).toBe("one");
  });

  it("a bar that cannot hold line one goes bare, whatever line two would have done", () => {
    /* line two would fit comfortably on its own — it must not rescue the bar */
    expect(fitLines(40, 90, 5)).toBe("bare");
  });

  it("the pad is what separates fitting from touching the ends", () => {
    expect(fitLines(100 + FIT_PAD_LONG, 100, null)).toBe("one");
    expect(fitLines(100 + FIT_PAD_LONG - 1, 100, null)).toBe("bare");
  });
});

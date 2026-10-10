/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A MOBILE FLOOR, NOT A MOBILE DESIGN. The claim these lock is narrow and worth stating exactly:
 * nothing in the funnel BREAKS below 900px. They do not claim any of it is designed for a phone.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

describe("the onboarding card has a small-screen step at all", () => {
  /** The journey carried ZERO @media rules before this — at any width it kept 30px body padding. */
  const css = readFileSync(resolve(here, "onboarding.css"), "utf8");

  it("declares a ≤640px breakpoint", () => {
    expect(css).toContain("@media (max-width: 640px)");
  });

  it("tightens the body, the band and the plate", () => {
    for (const selector of [".sa-onb-body", ".sa-onb-band", ".sa-onb-plate", ".sa-onb-foot"]) {
      expect(css).toContain(selector);
    }
  });

  /**
   * ⚠️ THE FOOT WRAPS RATHER THAN SHRINKING THE PRIMARY. At 10.5px mono a label like
   * "Save & explore agents" is already at its floor; squeezing it to hold one line would make the
   * one control that moves the flow on the hardest thing on the screen to read.
   */
  it("wraps the footer instead of compressing it", () => {
    const anchor = ".sa-onb-foot {";
    expect(css).toContain(anchor);
    const rule = css.slice(css.indexOf(anchor), css.indexOf("}", css.indexOf(anchor)));
    expect(rule).toContain("flex-wrap: wrap");
  });
});

describe("the scatter loader does not scatter cards off-screen", () => {
  const loader = read("ScatterSettleLoader.tsx");

  /**
   * ⚠️ THE REASON, IN THE CODE'S OWN NUMBERS: the SCATTER table is absolute offsets out to ±332px
   * from centre, plus a 440px card. Below ~1400px the outer cards start leaving the viewport; on a
   * phone most of the writer's own rows would be off-screen while a loader claimed to be showing
   * them their file.
   */
  it("has a narrow breakpoint", () => {
    expect(loader).toContain("NARROW_BP = 900");
  });

  it("reuses the reduced-motion path rather than adding a second fallback", () => {
    expect(loader).toContain("prefersReduced() || isNarrow()");
    // One switch drives the static presentation; a parallel branch would be a second thing to keep
    // in step with every future change to this loader, for no different outcome.
    expect(loader).toContain("const reduced = prefersStatic();");
  });
});

/* The review left its own full-screen shell for the set-up frame (onboarding v5 part 2), so the
   old shell's four claims (`.sa-rv-grid` stacking, the state band wrapping, `.sa-rv-scroll`, and
   `.sa-rv-root` clipping) have no subject. What replaces them: */
describe("the review collapses inside the frame", () => {
  const css = stripComments(readFileSync(resolve(here, "importFlow.css"), "utf8"));
  const review = read("SmartImportReview.tsx");

  it("the rail follows the list below 1100px", () => {
    const anchor = "@media (max-width: 1099.98px)";
    expect(css).toContain(anchor);
    const block = css.slice(css.indexOf(anchor), css.indexOf(anchor) + 260);
    expect(block).toContain(".sf .im-rev { grid-template-columns: minmax(0, 1fr); }");
  });

  /** The list card grows with its rows and the SHEET scrolls: the card has no scroller of its own. */
  it("the list card is not a scroller", () => {
    const anchor = ".sf .im-list {";
    expect(css).toContain(anchor);
    const rule = css.slice(css.indexOf(anchor), css.indexOf("}", css.indexOf(anchor)));
    expect(rule).not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    expect(rule).not.toMatch(/max-height/);
  });

  it("the old shell is gone", () => {
    for (const gone of ["sa-rv-root", "sa-rv-window", "sa-rv-scroll", "ReviewShell", "OnbNav", "REVIEW_SHELL_CSS"]) {
      expect(review, gone).not.toContain(gone);
    }
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A MOBILE FLOOR, NOT A MOBILE DESIGN. The claim these lock is narrow and worth stating exactly:
 * nothing in the funnel BREAKS below 900px. They do not claim any of it is designed for a phone.
 */
import { describe, it, expect } from "vitest";
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

describe("the review shell collapses without overflowing", () => {
  const review = read("SmartImportReview.tsx");

  it("the two-up main+sidebar stacks", () => {
    expect(review).toContain("@media(max-width:880px){ .sa-rv-grid{ grid-template-columns:1fr; } }");
  });

  /** The band's tally must wrap rather than push the window wide. */
  it("the state band wraps its contents", () => {
    const anchor = "@media(max-width:760px){";
    expect(review).toContain(anchor);
    const block = review.slice(review.indexOf(anchor), review.indexOf("}", review.indexOf(anchor) + 200));
    expect(block).toContain("flex-wrap:wrap");
  });

  /**
   * ⚠️ THE VIEWPORT LOCK, ASSERTED THE WAY THIS CODEBASE REQUIRES: the records column must be a
   * SCROLLER, not merely a region that happens not to overflow. "Page scroll is zero" is satisfied
   * equally by clipping, which is the failure this phrasing exists to exclude.
   */
  it("the records column remains a real scroller", () => {
    const anchor = ".sa-rv-scroll{";
    expect(review).toContain(anchor);
    const rule = review.slice(review.indexOf(anchor), review.indexOf("}", review.indexOf(anchor)));
    expect(rule).toMatch(/overflow(-y)?:\s*auto/);
  });

  it("and the window itself never becomes the scroller", () => {
    const anchor = ".sa-rv-root{";
    expect(review).toContain(anchor);
    const rule = review.slice(review.indexOf(anchor), review.indexOf("}", review.indexOf(anchor)));
    expect(rule).toContain("overflow:hidden");
  });
});

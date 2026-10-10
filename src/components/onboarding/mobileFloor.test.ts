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

/* RETIRED (onboarding v5 part 2): "the onboarding card has a small-screen step" — its three cases
   read `.sa-onb-*` rules, which were the old card's and went with it and its last reader. The
   frame's own phone arrangement is locked on the rendered page (OB1 F4). */
describe("the old card's phone rules are gone with the card", () => {
  it("no .sa-onb-* rule survives", () => {
    expect(readFileSync(resolve(here, "onboarding.css"), "utf8")).not.toContain(".sa-onb-");
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

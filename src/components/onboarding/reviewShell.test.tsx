/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the review shell's chassis, its state band, and the identity line.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";
import { IdentityLine } from "./IdentityLine";
import { reviewBandLabel } from "../../lib/smartImportReviewModel";

const here = dirname(fileURLToPath(import.meta.url));
const REVIEW = stripComments(readFileSync(resolve(here, "SmartImportReview.tsx"), "utf8"));

describe("the animated rim is deleted, not restyled", () => {
  /**
   * ⚠️ IT WAS THE ONLY THING IN THE APP THAT MOVED CONTINUOUSLY while a writer was trying to read,
   * and it encoded the review's state in a colour nobody could name. Deleted with its keyframes —
   * a paused or hidden rim would be the same element waiting to be switched back on.
   */
  for (const gone of ["sa-rv-rim", "sa-rv-band{", "saRvRimCross", "--rim-glow", "--rim-base"]) {
    it(`no ${gone}`, () => {
      expect(REVIEW).not.toContain(gone);
    });
  }

  it("and the burgundy inset frame goes with it", () => {
    expect(REVIEW).not.toContain("inset:7px");
  });

  it("the window is the app's white content surface on the app's hairline", () => {
    const anchor = ".sa-rv-window{";
    expect(REVIEW).toContain(anchor);
    const rule = REVIEW.slice(REVIEW.indexOf(anchor), REVIEW.indexOf(anchor) + 420);
    expect(rule).toContain("background:#ffffff");
    expect(rule).toContain("#e9e2d7"); // --ws-edge
  });
});

describe("the band states the count in words", () => {
  it("names the number, singular and plural", () => {
    expect(reviewBandLabel(0)).toBe("All clear");
    expect(reviewBandLabel(1)).toBe("1 needs a look");
    expect(reviewBandLabel(4)).toBe("4 need a look");
  });

  it("never appraises the number", () => {
    for (const n of [0, 1, 3, 40]) {
      expect(reviewBandLabel(n)).not.toMatch(/\b(only|just|already|still|good|bad|lots|few)\b/i);
    }
  });

  /**
   * ⚠️ ONE DERIVATION, OR THE BAND CAN DISAGREE WITH THE PAGE UNDER IT. Each stage used to pass its
   * own idea of all-clear (needCount / qLookCount / clusters.length) while the overview used a
   * fourth. All four call sites now read `reviewNeedCount`.
   */
  it("every ReviewShell call site reads the shared derivation", () => {
    const calls = REVIEW.match(/<ReviewShell[^>]*/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toContain("needCount={reviewNeedCount(");
    }
  });

  it("the boolean prop is gone, so a stage cannot invent its own answer", () => {
    expect(REVIEW).not.toContain("allClear={");
  });
});

/**
 * ⚠️ THREE STATES, AND THE RULE IS THE THING BEING TESTED. An agency-less agent is a complete,
 * valid record here, so a dangling separator would assert an absence that is not a fault.
 */
describe("the identity line", () => {
  const html = (agent: { name?: string; agency?: string }) =>
    renderToStaticMarkup(<IdentityLine agent={agent} />);

  /** The hairline's signature: a 1px × 15px element, not a border on either text. */
  const RULE = /width:1px;height:15px/;

  it("draws the rule when both a name and an agency exist", () => {
    const out = html({ name: "Eleanor Whitfield", agency: "Greenfield Literary" });
    expect(out).toContain("Eleanor Whitfield");
    expect(out).toContain("Greenfield Literary");
    expect(out).toMatch(RULE);
  });

  it("draws NO rule when there is a name but no agency", () => {
    const out = html({ name: "Eleanor Whitfield", agency: "" });
    expect(out).toContain("Eleanor Whitfield");
    expect(out).not.toMatch(RULE);
  });

  it("draws NO rule when there is an agency but no name — it takes the Playfair slot", () => {
    const out = html({ name: "", agency: "Greenfield Literary" });
    expect(out).toContain("Greenfield Literary");
    expect(out).not.toMatch(RULE);
  });

  it("renders nothing at all when neither exists", () => {
    expect(html({ name: "", agency: "" })).toBe("");
  });

  /**
   * ⚠️ NEVER A BORDER OR A PSEUDO-ELEMENT ON THE TEXT. Either moves with the text it is attached
   * to, so the rule drifts the moment the agency truncates. The shell refs fake it with a
   * `::before`; that is a ref-only patch, and this is the assertion that keeps it out of the build.
   */
  it("the separator is a sibling element, not a border on either text", () => {
    const src = stripComments(readFileSync(resolve(here, "IdentityLine.tsx"), "utf8"));
    expect(src).not.toContain("borderLeft");
    expect(src).not.toContain("::before");
    expect(src).toContain('flex: "0 0 auto"');
  });

  it("the agency truncates rather than wrapping, so the name and rule hold position", () => {
    const out = html({ name: "A", agency: "A Very Long Literary Agency Name Indeed And Then Some" });
    expect(out).toContain("text-overflow:ellipsis");
    expect(out).toContain("white-space:nowrap");
  });

  it("the agency is roman, never italic", () => {
    const out = html({ name: "Eleanor Whitfield", agency: "Greenfield Literary" });
    expect(out).not.toContain("font-style:italic");
  });
});

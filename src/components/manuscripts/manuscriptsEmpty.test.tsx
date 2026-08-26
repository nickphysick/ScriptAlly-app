/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE EMPTY SHELF ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE REF DRAWS NO EMPTY STATE — this is built from prose, so there is no artefact to check it
 * against. What CAN be locked is the grammar it has to stay inside: one chip and only on the gated
 * stage, dashed slots that name their commission, and a page that sells nothing.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptsEmpty, STAGE_SLOTS } from "./ManuscriptsEmpty";

const html = () => renderToStaticMarkup(<ManuscriptsEmpty onAdd={() => {}} />);

describe("the empty shelf", () => {
  it("names its three commission slots, dashed, in the brief's own keys", () => {
    expect(STAGE_SLOTS).toEqual(["ms-stage-shelf", "ms-stage-standing", "ms-stage-versions"]);
    for (const s of STAGE_SLOTS) expect(html()).toContain(`data-slot="${s}"`);
    const css = readFileSync(join(__dirname, "bookProfile.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(/(?:^|\n)\s*\.msp-stageslot\s*\{([^}]*)\}/.exec(css)?.[1]).toContain("border: 1px dashed");
  });

  /**
   * ⚠️ ONE CHIP, ON THE ONE GATED STAGE. Putting a book on the shelf and seeing where its queries
   * stand are free; naming the openings is Pro. A chip on either of the first two sells a writer
   * what they already have — twice now the reason a Pro-selling surface was retired from packages.
   */
  it("chips only the stage that is actually gated", () => {
    const out = html();
    expect(out.match(/>Pro</g)).toHaveLength(1);
    const versions = out.slice(out.indexOf("ms-stage-versions") - 900);
    expect(versions).toContain("Pro");
    // The two free stages sit before it, and neither carries one.
    expect(out.slice(0, out.indexOf("Name the openings"))).not.toContain(">Pro<");
  });

  it("offers exactly one act, and it is the one that gets you started", () => {
    const out = html();
    const buttons = out.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain("Add a manuscript");
  });

  /** ⚠️ IT SELLS NOTHING AND PROMISES NOTHING — no trial, no countdown, no invented tally. */
  it("makes no claim it cannot keep", () => {
    const out = html();
    expect(out).not.toMatch(/\btrial\b|free for|days left|join \d|\d+ writers|coming soon/i);
    // No figure at all: there is nothing yet to count.
    expect(out.replace(/[^>]*>/g, " ")).not.toMatch(/\b\d+\b/);
  });

  it("describes what the app does today, in the present tense", () => {
    const out = html();
    expect(out).not.toMatch(/\bwill (?:soon|be able|let)\b|\bshortly\b|\bplanned\b/i);
    expect(out).toContain("Put the book on the shelf");
    expect(out).toContain("See where every query stands");
    expect(out).toContain("Name the openings you send");
  });

  it("carries its own shelf header, so the page never renders two", () => {
    expect(html()).toContain("Your shelf");
    expect(html().match(/Your shelf/g)).toHaveLength(1);
  });
});

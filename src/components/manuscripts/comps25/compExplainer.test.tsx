/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comps v26, Part B: the first-comp explainer's rules. Where it shows is measured on the rendered
 * page (tests/e2e/compsV26.measure.ts, AD2).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { startsOpen } from "../CompForm";
import { CompExplainer, EXPLAIN_POINTS } from "./CompExplainer";

describe("the explainer", () => {
  it("starts open only for an add by a writer with no comps", () => {
    expect([startsOpen({ mode: "add", first: true }), startsOpen({ mode: "add", first: false }), startsOpen({ mode: "edit", first: true })]).toEqual([true, false, false]);
  });
  it("open: the heading, three points and the hide link; folded: one link", () => {
    const open = renderToStaticMarkup(<CompExplainer open first onToggle={() => {}} />);
    expect(open).toContain("What’s a comparable title?");
    expect((open.match(/data-cf="explain-point"/g) ?? []).length).toBe(3);
    expect(EXPLAIN_POINTS.map((p) => p.lead)).toEqual(["Recent.", "A fair match.", "Not a household name."]);
    expect(open).toContain("Got it, hide this");
    expect(renderToStaticMarkup(<CompExplainer open first={false} onToggle={() => {}} />)).toContain(">Hide<");
    const folded = renderToStaticMarkup(<CompExplainer open={false} first={false} onToggle={() => {}} />);
    expect(folded).toContain("What makes a good comp?");
    expect(folded).not.toContain("data-cf=\"explain\"");
  });
  it("uses a drawing the app already has, and nothing is stored when it is hidden", () => {
    const src = readFileSync("src/components/manuscripts/comps25/CompExplainer.tsx", "utf8");
    expect(src).toContain("DASH_ART.mentorLooking");
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("the form mounts it in add mode only", () => {
  it("one mount, behind the add check", () => {
    const form = readFileSync("src/components/manuscripts/CompForm.tsx", "utf8");
    expect(form.split("<CompExplainer").length - 1).toBe(1);
    expect(form).toContain('{form.mode === "add" && <CompExplainer');
  });
});

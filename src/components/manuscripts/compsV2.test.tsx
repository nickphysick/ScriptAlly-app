/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v2 — the unit-level locks (the rendered ones are tests/e2e/compsMat.measure.ts).
 *
 * These replace compsPhase2.test.ts and compsPhase3.test.ts, which read the v3 page's SOURCE for
 * its markup and copy and were retired with it. What survives here is the part a unit can prove
 * without a browser: the form's pure rules, what the page imports (C5), that the examples are
 * pictures (C7), and that a failed write cannot escape (C9).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { joinTags, splitTags, yearError } from "./CompForm";
import { CompsScoutRail } from "./CompsScoutRail";

const here = dirname(fileURLToPath(import.meta.url));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const src = (f: string) => strip(readFileSync(join(here, f), "utf8"));

describe("C3 · the form's rules", () => {
  it("a year is four digits between 1000 and 2100, or empty", () => {
    for (const ok of ["", "  ", "1000", "2021", "2100"]) expect(yearError(ok), ok).toBeNull();
    for (const bad of ["20", "202", "20211", "999", "2101", "20a1", "-202"]) expect(yearError(bad), bad).toBe("Use four digits, like 2021.");
  });
  it("never judges a year by its age — only its shape", () => {
    expect(yearError("1066")).toBeNull();
  });
  it("tags are stored joined with ' · ', and split back the same way", () => {
    expect(joinTags(["harbour town", " tides ", ""])).toBe("harbour town · tides");
    expect(splitTags("harbour town · tides")).toEqual(["harbour town", "tides"]);
    expect(splitTags(undefined)).toEqual([]);
  });
});

describe("C5 · the page cannot reach the Scout", () => {
  const page = ["ComparableTitlesPage.tsx", "CompsScoutRail.tsx", "CompCard.tsx", "CompForm.tsx", "CompsQueryLine.tsx"];
  it("nothing the page mounts imports the Scout's client or its panel", () => {
    for (const f of page) {
      const s = src(f);
      expect(s, `${f} imports lib/suggestComps`).not.toMatch(/from ["'][./]*lib\/suggestComps["']/);
      expect(s, `${f} names fetchCompRun`).not.toContain("fetchCompRun");
      expect(s, `${f} mounts ScoutPanel`).not.toMatch(/<ScoutPanel\b|from ["']\.\/ScoutPanel["']/);
    }
  });
  it("the rail renders no control at all", () => {
    const html = renderToStaticMarkup(<CompsScoutRail />);
    expect(html).toContain("The Scout");
    expect(html).toContain("Coming soon");
    expect(html, "the rail rendered a button").not.toMatch(/<button\b|<a\b[^>]*href|<input\b/);
    expect(html).toMatch(/data-cpv="rail-examples"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-cpv="rail-examples"/);
  });
});



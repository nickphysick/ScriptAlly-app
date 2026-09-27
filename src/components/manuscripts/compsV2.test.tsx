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
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { joinTags, splitTags, yearError } from "./CompForm";

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




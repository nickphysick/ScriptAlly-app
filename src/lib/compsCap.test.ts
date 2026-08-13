/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The comps cap, artefact-locked across the client and the rules.
 *
 * ⚠️ THE FAULT THIS EXISTS TO CATCH IS SILENT. `MAX_COMPS` and `firestore.rules`' size cap govern the
 * same list from two sides. Raise one and not the other and the client cheerfully permits a write the
 * rules reject — denied with no error the UI surfaces, the same class as the affectedKeys allowlist
 * gotcha. Nothing goes red; comps simply stop saving past a number nobody remembers changing.
 *
 * ⚠️ IT COMPARES THE TWO ARTEFACTS AGAINST EACH OTHER, not each against a literal. Two `toBe(100)`s
 * would go green the day someone changed both in the same wrong direction, which is precisely the day
 * this should fail.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_COMPS, withCompAdded } from "./comps";
import { CompTitle } from "../types";

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(here, "..", "..", "firestore.rules"), "utf8");

describe("the comps cap", () => {
  it("is the same number in the client and in firestore.rules", () => {
    const m = rules.match(/data\.comps is list && data\.comps\.size\(\) <= (\d+)/);
    expect(m, "the comps size cap is no longer where this lock looks for it").not.toBeNull();
    /* extracted and compared in code — never a lookahead, which after optional whitespace matches
       the value it is meant to exclude */
    expect(Number(m![1]), "firestore.rules disagrees with MAX_COMPS").toBe(MAX_COMPS);
  });

  /**
   * ⚠️ NON-BINDING IS THE WHOLE POINT (baked decision 5 + 21). A commercial cap is forbidden here;
   * this is a document-size guard, so it has to sit far beyond any real shelf. A writer's query
   * letter uses two or three comps and a working research list runs to a dozen or two.
   */
  it("sits far beyond any plausible working shelf", () => {
    expect(MAX_COMPS).toBeGreaterThanOrEqual(100);
  });

  /**
   * ⚠️ AND IT CANNOT EXCEED THE DOCUMENT LIMIT AT WORST-CASE FIELD LENGTHS — the reason 1,000 was
   * rejected. Firestore's own sizing: string = UTF-8 bytes + 1, number 8, bool 1, map 32 + fields,
   * array 32 + elements, 1,048,576 bytes per document. A guard that can be exceeded is not a guard.
   */
  it("cannot overflow the document at worst-case field lengths", () => {
    const WORST_CASE_COMP_BYTES = 1146; // all nine fields, generous lengths — see MAX_COMPS
    const DOC_LIMIT = 1_048_576;
    const REST_OF_MANUSCRIPT = 20_000; // logline + notes are the only unbounded strings
    expect(MAX_COMPS * WORST_CASE_COMP_BYTES + REST_OF_MANUSCRIPT).toBeLessThan(DOC_LIMIT);
  });

  it("still refuses to grow past itself, without mutating", () => {
    const full: CompTitle[] = Array.from({ length: MAX_COMPS }, (_, i) => ({ title: `T${i}` }));
    expect(withCompAdded(full, { title: "overflow" })).toBe(full);
    expect(full).toHaveLength(MAX_COMPS);
  });
});

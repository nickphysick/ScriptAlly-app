/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part H — How it works, rewritten: five steps in the pack's words, the real minimum-answers
 * constant, and none of v39.2's copy (labels, the materials card, dragging). The rendered half (Escape, the arrows,
 * a click outside) is L9 in tests/e2e/pk41.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packagesV38";
import { HOW_STEPS } from "./Pk41HowItWorks";

const src = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("v41 H · How it works", () => {
  it("has five steps with the pack's titles", () => {
    expect(HOW_STEPS.map(([t]) => t)).toEqual(["Make a package", "Pick each piece", "Set your current batch", "Log a query with it", "See what’s working"]);
  });
  it("its copy is the pack's, exactly", () => {
    expect(HOW_STEPS[0][1]).toBe("Press + New package, give it a name and choose an icon and colour you’ll recognise. That look follows it everywhere: the list, the Query Centre and your results.");
    expect(HOW_STEPS[1][1]).toBe("Open a package and work down its steps. Start with the version of your book, because it decides which pages go out. Then add a query letter, a synopsis if you want one, and anything agents might ask for. The preview shows exactly what an agent receives.");
    expect(HOW_STEPS[2][1]).toBe("The row under the header shows what your current batch is going out with. Change it when you start a new batch, and it’s picked for you each time you log a query.");
    expect(HOW_STEPS[3][1]).toBe("Choose the package as you log a query and QueryHawk records exactly what went. Once a package is out with agents it locks, so what each agent got stays true. To change anything, make a copy.");
    expect(HOW_STEPS[4][1]).toBe("Further down, How your packages are doing ranks your packages by how often agents ask for more, then your versions, letters and synopses. Each one is ranked once 4 agents have answered, so one lucky reply can’t top the list.");
  });
  it("the threshold is the real constant", () => {
    expect(MIN_SENDS_FOR_CLAIM).toBe(4);
    expect(src("src/components/packages/v41/Pk41HowItWorks.tsx")).toContain("${MIN_SENDS_FOR_CLAIM} agents have answered");
  });
  it("no string from the old guide remains, and the old guide is gone", () => {
    const all = HOW_STEPS.flat().join(" ");
    for (const old of ["Drag them into the package", "Keep your materials in one place", "Your packages sit in a row"]) expect(all).not.toContain(old);
    const page = src("src/components/SubmissionPackages.tsx");
    expect(page).toContain("<Pk41HowItWorks");
    expect(page).not.toContain("Pk39HowItWorks");
  });
});

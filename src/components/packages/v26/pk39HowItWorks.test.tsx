/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 Part G — How it works: the pack's copy, verbatim, and the old dialog gone. The rendered half
 * (both doors, five steps, Escape, focus back to the opener) is L7 in tests/e2e/pk39.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HOW_STEPS } from "./Pk39HowItWorks";

const src = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("Part G · How it works", () => {
  it("has five steps, in the pack's words", () => {
    expect(HOW_STEPS.map(([t]) => t)).toEqual([
      "Pick a package, or make one", "Keep your materials in one place", "Drag them into the package", "Pick it when you log a query", "See what’s working",
    ]);
    expect(HOW_STEPS[0][1]).toBe("Your packages sit in a row at the top. Each has its own icon and colour, so you can spot it at a glance here, in the Query Centre and in your results. Click one to open it below, or press + New.");
    /* v39.2 C: step 3 leads with the version */
    expect(HOW_STEPS[2][1]).toBe("Start with the version of your book: it decides which pages go out. Then add a query letter and, if you want one, a synopsis. Anything else agents ask for goes under Also sends.");
    expect(HOW_STEPS[3][1]).toBe("Choose the package as you log a query and every slot fills itself. Once it’s out with agents it locks, so what each agent got stays true. Change it later and the queries already sent keep what they had.");
    expect(HOW_STEPS[4][1]).toContain("Each one ranks once enough agents have answered.");
  });
  it("the old dialog (`#hwm`, the three-step diagram) is deleted, and the page mounts only the guide", () => {
    const header = src("src/components/packages/v26/Pk26Header.tsx");
    expect(header).not.toContain("export const HowItWorks");
    expect(header).not.toContain("p6-hwm");
    expect(header).not.toContain("HowDiagram");
    const page = src("src/components/SubmissionPackages.tsx");
    expect(page).toContain("<Pk39HowItWorks");
    expect(page).not.toMatch(/<HowItWorks\b/);
  });
});

/**
 * The To-do page's retired surfaces stay retired — the colophon, the Pro strips, and (27 Sep) the
 * weekly review's banner, briefing, entry link and six-step sheet. Formerly `briefingSlot.test.ts`,
 * whose derivations went with the review; what survives are the absence locks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const decls = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the sweep: nothing orphaned is left behind", () => {
  const css = decls(readFileSync(join(__dirname, "..", "components", "todo", "todo.css"), "utf8"));
  const shellCss = decls(readFileSync(join(__dirname, "..", "components", "shell", "todoShell.css"), "utf8"));

  it("the colophon, the review banner and every Pro predecessor are gone from the stylesheets", () => {
    for (const dead of ["tdb-colo", "cololink", "tdb-rvbox", "tdb-prostrip", "tdb-feat", "spine-pro", "tdb-brief", "tdb-revlink", "tdb-rv"]) {
      expect(css, `todo.css still has ${dead}`).not.toContain(dead);
      expect(shellCss, `todoShell.css still has ${dead}`).not.toContain(dead);
    }
  });

  it("no tour step referenced the colophon, a Pro surface or the weekly review", () => {
    const tour = readFileSync(join(__dirname, "todoTour.ts"), "utf8");
    for (const dead of ["colo", "prostrip", "ProStrip", "tdb-feat", "rvbox", "revlink"]) expect(tour).not.toContain(dead);
  });
});

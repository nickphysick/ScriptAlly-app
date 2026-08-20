/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four layout laws, scanned in the stylesheets they govern.
 *
 * ⚠️ COMMENTS ARE STRIPPED FIRST. Every one of these files EXPLAINS the fault it was written to
 * avoid, quoting the banned declaration to do it — `margin: -8px 0 16px` appears in prose beside
 * the rule that replaced it. A scan over raw source finds the explanation and reports it as the
 * offence; this repo has burned seven false reds on exactly that. Strip, then assert.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const SHEETS = {
  "settings.css": decls(readFileSync(join(here, "settings.css"), "utf8")),
  "planComparison.css": decls(readFileSync(join(here, "..", "plans", "planComparison.css"), "utf8")),
};

describe("law 2 — no negative margins anywhere in the settings scope", () => {
  for (const [name, css] of Object.entries(SHEETS)) {
    it(`${name} declares none`, () => {
      const found = css.match(/margin[a-z-]*:\s*[^;]*-\d/g) ?? [];
      expect(found, `negative margins in ${name}: ${found.join(" | ")}`).toEqual([]);
    });
  }
});

describe("law 4 — nowrap only on a mono chip label", () => {
  it("settings.css uses it nowhere", () => {
    expect(SHEETS["settings.css"]).not.toContain("nowrap");
  });

  /* ⚠️ ONE PERMITTED USE, AND IT IS NAMED. A two-line "CURRENT" pill is not a pill; a two-line
     VALUE is fine, which is why `.plc-figure` lost its own. */
  it("planComparison.css uses it once, on the chip", () => {
    const uses = (SHEETS["planComparison.css"].match(/white-space:\s*nowrap/g) ?? []).length;
    expect(uses, "exactly one").toBe(1);
    const chip = SHEETS["planComparison.css"].slice(
      SHEETS["planComparison.css"].indexOf(".plc-chip {"),
    );
    expect(chip.slice(0, chip.indexOf("}"))).toContain("nowrap");
  });
});

/* ⚠️ THE SPACING TOKENS ARE DEFINED EXACTLY ONCE (law 3). A second definition anywhere is a second
   rhythm, which is the state this build was opened to end. */
describe("law 3 — one rhythm, defined once", () => {
  const TOKENS = ["--acct-s-label", "--acct-s-note", "--acct-s-block", "--acct-s-rule"];

  for (const t of TOKENS) {
    it(`${t} is declared once`, () => {
      const declared = (SHEETS["settings.css"].match(new RegExp(`${t}\\s*:`, "g")) ?? []).length;
      expect(declared, `${t} declarations`).toBe(1);
    });
  }

  it("and each is actually read, so none is a knob nobody turns", () => {
    for (const t of TOKENS) {
      expect(SHEETS["settings.css"], t).toContain(`var(${t})`);
    }
  });
});

/* ⚠️ AND EVERY `var()` THE SHEET READS MUST RESOLVE. A calc() on an undefined custom property
   yields NaN and the declaration is silently dropped — the fault that once rendered the shell's
   only active marker 0px wide through a green build and 2,259 green tests. */
describe("no settings rule reads a token that does not exist", () => {
  it("every locally-namespaced var() has a definition", () => {
    const css = SHEETS["settings.css"];
    const read = new Set([...css.matchAll(/var\((--acct-[a-z-]+)/g)].map((m) => m[1]));
    for (const token of read) {
      expect(css, `${token} is read but never defined`).toContain(`${token}:`);
    }
    expect(read.size, "the scan must have found some").toBeGreaterThan(3);
  });
});

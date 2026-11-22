/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { isShouting, nameCase } from "./nameCase";

describe("v149.1 B5 — all-caps names are title-cased; mixed case is the writer's", () => {
  it("title-cases a shouting name, across spaces, hyphens, apostrophes and initials", () => {
    expect(nameCase("PRIYA RAMAN")).toBe("Priya Raman");
    expect(nameCase("O'BRIEN")).toBe("O'Brien");
    expect(nameCase("SMITH-JONES")).toBe("Smith-Jones");
    expect(nameCase("J. K. ROWLING")).toBe("J. K. Rowling");
  });
  it("leaves every name with a lowercase letter exactly as written", () => {
    for (const n of ["McDonald", "de la Cruz", "bell hooks", "Priya Raman", "JD Salinger fan", "A", ""]) expect(nameCase(n)).toBe(n);
    expect(isShouting("JD")).toBe(true);
    expect(isShouting("A")).toBe(false);
  });
});

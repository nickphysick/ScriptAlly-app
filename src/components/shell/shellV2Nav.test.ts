/**
 * Locks for the v2 shell navigation model (ref design-refs/scriptally-shell-v2.html) — the
 * section/page mapping is product grammar, not URL shape, so it is asserted explicitly:
 * Packages and To-do file under Querying; Comparable titles stays on the Shelf.
 */
import { describe, it, expect } from "vitest";
import {
  SHELL_SECTIONS,
  SHELL_SETUP,
  shellCrumbForPath,
  shellPageForPath,
  shellSectionKeyForPath,
} from "./shellV2Nav";

describe("shellV2Nav — section model", () => {
  it("carries the four rail sections in mockup order", () => {
    expect(SHELL_SECTIONS.map((s) => s.key)).toEqual(["desk", "queries", "agents", "shelf"]);
    expect(SHELL_SECTIONS.map((s) => s.caption)).toEqual(["Desk", "Queries", "Agents", "Shelf"]);
  });

  it("files To-do and Packages under Querying (product grammar, not URL tree)", () => {
    const querying = SHELL_SECTIONS.find((s) => s.key === "queries")!;
    expect(querying.sectionName).toBe("Querying");
    expect(querying.pages.map((p) => p.path)).toEqual(["/queries", "/todo", "/manuscripts/packages"]);
  });

  it("keeps Comparable titles and Import on the Shelf", () => {
    const shelf = SHELL_SECTIONS.find((s) => s.key === "shelf")!;
    expect(shelf.sectionName).toBe("Manuscripts");
    expect(shelf.pages.map((p) => p.path)).toEqual(["/manuscripts", "/manuscripts/comps", "/import"]);
  });

  it("pins Setup to /account", () => {
    expect(SHELL_SETUP.path).toBe("/account");
  });
});

describe("shellV2Nav — path matching", () => {
  it("matches pages exactly (packages beats the manuscripts prefix)", () => {
    expect(shellPageForPath("/manuscripts/packages")?.section.key).toBe("queries");
    expect(shellPageForPath("/manuscripts")?.section.key).toBe("shelf");
    expect(shellPageForPath("/manuscripts/comps")?.section.key).toBe("shelf");
  });

  it("lights the owning section per route", () => {
    expect(shellSectionKeyForPath("/dashboard")).toBe("desk");
    expect(shellSectionKeyForPath("/queries")).toBe("queries");
    expect(shellSectionKeyForPath("/todo")).toBe("queries");
    expect(shellSectionKeyForPath("/agents")).toBe("agents");
    expect(shellSectionKeyForPath("/agents/discover")).toBe("agents");
    expect(shellSectionKeyForPath("/import")).toBe("shelf");
  });

  it("lights nothing off the map (focus/marketing/unknown)", () => {
    expect(shellSectionKeyForPath("/account")).toBeNull();
    expect(shellSectionKeyForPath("/")).toBeNull();
    expect(shellSectionKeyForPath("/nope")).toBeNull();
  });

  it("builds the Section / Page crumb", () => {
    expect(shellCrumbForPath("/todo")).toEqual({ section: "Querying", page: "To-do" });
    expect(shellCrumbForPath("/manuscripts/packages")).toEqual({ section: "Querying", page: "Packages" });
    expect(shellCrumbForPath("/agents")).toEqual({ section: "Agents", page: "Contact list" });
    expect(shellCrumbForPath("/plans")).toBeNull();
  });
});

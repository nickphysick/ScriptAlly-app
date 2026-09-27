/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * page header v2 §1 — the bar's page name and the switcher's lines, on the live nav model.
 */
import { describe, it, expect } from "vitest";
import { barPageName, shellHitFor, OFF_NAV_NAMES } from "./workspaceShell";
import { workspaceSections } from "./workspaceNav";
import { switcherMeta, switcherRowMeta, coverTint } from "../components/shell/BarSwitcher";

const SECTIONS = workspaceSections({ todo: 0 });
const name = (p: string) => barPageName(SECTIONS, shellHitFor(SECTIONS, p), p);

describe("barPageName — the sidebar's own section heading and label", () => {
  it("names each page under its heading", () => {
    expect(name("/agents")).toEqual({ section: "Agents", name: "Contact list" });
    expect(name("/queries")).toEqual({ section: "Queries", name: "Query Centre" });
    expect(name("/manuscripts/comps")).toEqual({ section: "Materials", name: "Comparable titles" });
    expect(name("/todo/calendar")).toEqual({ section: "Tasks", name: "Calendar" });
    expect(name("/account/profile")).toEqual({ section: "Account", name: "Settings" });
  });
  it("⚠️ the first group has no heading in the sidebar, so the Dashboard's name stands alone", () => {
    expect(name("/dashboard")).toEqual({ section: null, name: "Dashboard" });
  });
  it("routes outside the nav name themselves, with no section", () => {
    for (const [p, n] of Object.entries(OFF_NAV_NAMES)) expect(name(p)).toEqual({ section: null, name: n });
  });
});

describe("the switcher's lines — only the parts the record has", () => {
  it("genre and words, never '0 words'", () => {
    expect(switcherMeta({ genre: "Thriller", wordCount: 50000 })).toBe("Thriller · 50,000 words");
    expect(switcherMeta({ genre: "Mystery", wordCount: 0 })).toBe("Mystery");
    expect(switcherMeta({})).toBe("");
  });
  it("the menu row adds the query count only when there are queries", () => {
    expect(switcherRowMeta({ genre: "Thriller", wordCount: 50000 }, 26)).toBe("Thriller · 50,000 words · 26 queries");
    expect(switcherRowMeta({ genre: "Literary", wordCount: 92000 }, 1)).toBe("Literary · 92,000 words · 1 query");
    expect(switcherRowMeta({ genre: "Mystery" }, 0)).toBe("Mystery");
  });
  it("the active book is always the rust tint; the rest alternate", () => {
    expect(coverTint(true, 3)).toBe("a");
    expect([0, 1, 2].map((i) => coverTint(false, i))).toEqual(["b", "c", "b"]);
  });
});

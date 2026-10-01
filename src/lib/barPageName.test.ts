/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * page header v2 §1 — the bar's page name and the switcher's lines, on the live nav model.
 */
import { describe, it, expect } from "vitest";
import { barPageName, shellHitFor, OFF_NAV_NAMES } from "./workspaceShell";
import { workspaceSections } from "./workspaceNav";
import { switcherMeta, switcherStanding, switcherFacts } from "../components/shell/BarSwitcher";
import { ManuscriptStatus, QueryStatus } from "../types";

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
  /* ⚠️ THE SIDEBAR HEADS DASHBOARD WITH "WORKSPACE" NOW (sidebar metrics pass); the bar keeps naming it
     alone — a stated difference, flagged for Nick, not an oversight (see barPageName's note). */
  it("⚠️ the Dashboard's name stands alone in the bar", () => {
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
  /* ⚠️ RETIRED BY SWITCHER v2: "the menu row adds the query count…" (`switcherRowMeta`) and "the active
     book is always the rust tint" (`coverTint`). The row's meta and its facts are separate lines now,
     and every cover is the manuscript's object colour (`--o-ms`) or its own `coverUrl`. */
  it("the tile's standing: the status, then 'N with you' only when the book has live queries", () => {
    const q = (status: QueryStatus) => ({ status });
    expect(switcherStanding({ status: ManuscriptStatus.QUERYING }, [q(QueryStatus.FULL_REQUESTED), q(QueryStatus.QUERIED), q(QueryStatus.REJECTED)]))
      .toEqual({ status: "Querying", withYou: 1 });
    expect(switcherStanding({ status: ManuscriptStatus.QUERYING }, [q(QueryStatus.QUERIED)])).toEqual({ status: "Querying", withYou: 0 });
    expect(switcherStanding({ status: ManuscriptStatus.REVISING }, [])).toEqual({ status: "Revising", withYou: null });
    expect(switcherStanding({ status: ManuscriptStatus.SHELVED }, [q(QueryStatus.REJECTED)])).toEqual({ status: "Shelved", withYou: null });
  });
  it("the row's facts: since and count, the count alone, or no queries yet", () => {
    expect(switcherFacts([{ dateSent: "2025-12-05" }, { dateSent: "2026-01-02" }])).toMatch(/^Querying since 5 DEC · 2 queries$/i);
    expect(switcherFacts([{ dateSent: "" }])).toBe("1 query");
    expect(switcherFacts([])).toBe("No queries yet");
  });
});

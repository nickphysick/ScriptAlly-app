/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the plateband and the tab row.
 *
 * This repo has NO jsdom (`vitest.config.ts` is `environment: 'node'`), so components render
 * through `renderToStaticMarkup` and are asserted against the HTML string. Per the house rule,
 * these use whole-string `toContain`/`toMatch` and never slice — a slice that misses its anchor
 * passes against an empty string and tests nothing.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManuscriptPlate, ManuscriptPlateProps } from "./ManuscriptPlate";
import { ManuscriptTabs, MANUSCRIPT_TABS, DEFAULT_MANUSCRIPT_TAB } from "./ManuscriptTabs";
import { plateStats, plateStatCells, formatPlateDate } from "../../lib/manuscriptPlate";
import { Query, QueryStatus } from "../../types";

const q = (over: Partial<Query> = {}): Query =>
  ({
    id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
    status: QueryStatus.QUERIED, dateSent: "2026-06-20T00:00:00.000Z",
    personalisationNotes: "", sendMethod: "Email",
    ...over,
  } as Query);

const BASE: ManuscriptPlateProps = {
  title: "Murphy's Day Out",
  status: "Querying",
  genres: ["Young Adult", "Thriller"],
  wordCount: 50000,
  logline: "Murphy catches a fly",
  stats: { queriesSent: 4, responses: 1, lastActivity: "8 Aug" },
};

const plate = (over: Partial<ManuscriptPlateProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptPlate, { ...BASE, ...over }));

describe("the plateband states the manuscript's identity", () => {
  it("renders title, genre pills, word count and status", () => {
    const html = plate();
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("Young Adult");
    expect(html).toContain("Thriller");
    expect(html).toContain("50,000 words");
    expect(html).toContain("Querying");
  });

  it("the word count is grouped to en-GB, not raw digits", () => {
    expect(plate({ wordCount: 105000 })).toContain("105,000 words");
    expect(plate({ wordCount: 105000 })).not.toContain("105000 words");
  });

  it("reuses the page's existing status-pill treatment rather than restyling it", () => {
    expect(plate()).toContain("msv-statuspill");
    expect(plate()).toContain("msv-dt");
  });

  it("a shelved manuscript greys the pill", () => {
    expect(plate({ shelved: true, status: "Shelved" })).toContain("msv-statuspill grey");
    expect(plate()).not.toContain("msv-statuspill grey");
  });
});

describe("⚠️ absence omits itself — nothing renders placeholder prose or a false zero", () => {
  it("no logline means NO logline element, not a prompt to write one", () => {
    const html = plate({ logline: undefined });
    expect(html).not.toContain("msv-platelog");
    expect(html).not.toMatch(/no logline|add one|Edit details\./i);
  });

  it("an empty-string logline is absence too, not an empty italic line", () => {
    expect(plate({ logline: "" })).not.toContain("msv-platelog");
  });

  it("no genres means no pills, and the row still holds the word count", () => {
    const html = plate({ genres: [] });
    expect(html).not.toContain("msv-gp");
    expect(html).toContain("50,000 words");
  });

  it("no word count omits the words line rather than printing 0 words", () => {
    const html = plate({ wordCount: undefined });
    expect(html).not.toContain("words");
  });

  /**
   * ⚠️ THE TWO KINDS OF NOTHING. Zero queries is a true count and reads `0`. Zero last-activity is
   * not a number at all — there is no date — so it reads `—`. Collapsing them would either invent
   * an event or refuse to state a real zero.
   */
  it("with no queries: counts read 0, last activity reads an em dash", () => {
    const html = plate({ stats: { queriesSent: 0, responses: 0, lastActivity: null } });
    expect(html).toContain("Queries");
    expect(html).toContain("Last activity");
    expect(html).toContain("—");
    expect(html).not.toContain(">0 <");
  });

  it("plateStatCells is where that split lives, so every caller resolves absence alike", () => {
    expect(plateStatCells({ queriesSent: 0, responses: 0, lastActivity: null })).toEqual([
      { key: "Queries", value: "0" },
      { key: "Responses", value: "0" },
      { key: "Last activity", value: "—" },
    ]);
  });
});

describe("the figures are DERIVED from queries, never passed as stored counters", () => {
  it("queriesSent counts the manuscript's queries", () => {
    expect(plateStats([q(), q({ id: "q2" }), q({ id: "q3" })]).queriesSent).toBe(3);
  });

  /**
   * ⚠️ RESPONSES COUNT THROUGH `isResponse` — the canonical predicate the package maths uses.
   * A local "did the agent reply" test here would eventually disagree with the rest of the app,
   * and one fact would carry two numbers on two pages.
   */
  it("responses count through the canonical predicate — a request IS a response", () => {
    const qs = [
      q({ id: "a", status: QueryStatus.QUERIED }),
      q({ id: "b", status: QueryStatus.PARTIAL_REQUESTED }),
      q({ id: "c", hasAgentResponded: true }),
    ];
    expect(plateStats(qs).responses).toBe(2);
  });

  it("lastActivity is the most recent across all queries, formatted `8 Aug`", () => {
    const qs = [
      q({ id: "a", dateSent: "2026-06-20T00:00:00.000Z" }),
      q({ id: "b", dateSent: "2026-08-08T00:00:00.000Z" }),
    ];
    expect(plateStats(qs).lastActivity).toBe("8 Aug");
  });

  it("no queries at all yields a null date, not today's", () => {
    expect(plateStats([]).lastActivity).toBeNull();
  });

  it("the date format carries no year — the strip is a glance, not a record", () => {
    expect(formatPlateDate(Date.parse("2024-03-14T00:00:00.000Z"))).toBe("14 Mar");
  });
});

describe("the plate's actions", () => {
  /**
   * ⚠️ "EDIT DETAILS" IS GONE FROM THE PLATE — the plate IS the form now. It survives in the
   * dossier's ⋯ menu because status, shelved reason and notes have no inline editor and no other
   * surface; that is asserted in manuscriptDossier.test.tsx, where the menu lives.
   */
  it("carries Send a query and no Edit details button", () => {
    const html = plate();
    expect(html).toContain("Send a query");
    expect(html).toContain("msv-primary");
    expect(html).not.toContain("Edit details");
  });

  it("⚠️ a shelved manuscript offers NO Send — the plate list's existing rule", () => {
    expect(plate({ shelved: true })).not.toContain("Send a query");
  });
});

describe("⚠️ the plate mark is the dashboard PNG, not a fifth traced SVG", () => {
  it("renders an img, not an inline svg, and its alt is empty (decorative)", () => {
    const html = plate();
    expect(html).toContain("msv-plateimg");
    expect(html).toContain("<img");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("<svg");
  });
});

describe("the tab row", () => {
  const tabs = (active = DEFAULT_MANUSCRIPT_TAB) =>
    renderToStaticMarkup(React.createElement(ManuscriptTabs, { active, onChange: () => {} }));

  /* ⚠️ THE KEYS ARE INTERNAL, THE LABELS ARE THE PRODUCT. The reframe renames the first pane to
     "The record"; the key stays `details` because renaming it would churn every call site to say
     the same thing twice. */
  it("is the four tabs, in order", () => {
    expect(MANUSCRIPT_TABS.map((t) => t.key)).toEqual(["pitch", "details", "comps", "packages"]);
    expect(MANUSCRIPT_TABS.map((t) => t.label)).toEqual([
      "The pitch", "The record", "Comparable titles", "Submission packages",
    ]);
  });

  /* ⚠️ THE PITCH IS FIRST AND IS THE DEFAULT because it is what the page is FOR. The reframe's
     complaint about the old page was that nothing on it had been put there by the writer; the pitch
     shelf is the answer, so it is what the dossier opens on. */
  it("opens on The pitch", () => {
    expect(DEFAULT_MANUSCRIPT_TAB).toBe("pitch");
  });

  /** The selected label, read back off the rendered row — attribute order is React's, not ours. */
  const selectedLabel = (html: string) =>
    /aria-selected="true"[^>]*>([^<]+)</.exec(html)?.[1] ?? null;

  it("marks exactly one tab active, and it moves with the prop", () => {
    expect(selectedLabel(tabs("pitch"))).toBe("The pitch");
    expect(selectedLabel(tabs("details"))).toBe("The record");
    expect(selectedLabel(tabs("comps"))).toBe("Comparable titles");
    expect(selectedLabel(tabs("packages"))).toBe("Submission packages");
    for (const active of ["pitch", "details", "comps", "packages"] as const) {
      expect(tabs(active).match(/aria-selected="true"/g)).toHaveLength(1);
      expect(tabs(active).match(/msv-tab on/g)).toHaveLength(1);
    }
  });

  it("calls onChange with the tab's key", () => {
    const seen: string[] = [];
    const row = ManuscriptTabs({ active: "details", onChange: (k) => seen.push(k) }) as React.ReactElement;
    const children = (row.props as { children: React.ReactElement[] }).children;
    children.forEach((c) => (c.props as { onClick: () => void }).onClick());
    expect(seen).toEqual(["pitch", "details", "comps", "packages"]);
  });

  /**
   * ⚠️ THE MOCKUP DRAWS A PRO CHIP ON SUBMISSION PACKAGES AND IT IS NOT BUILT. That route has no
   * Pro gate, so the chip would sell a feature the user already has — the same bug that already
   * caused a Pro-selling landing to be retired from packages once.
   */
  it("carries NO Pro chip on any tab", () => {
    for (const active of ["pitch", "details", "comps", "packages"] as const) {
      expect(tabs(active)).not.toMatch(/prochip|>Pro</i);
    }
  });

  /** No route, no URL param — a tab is a toggle inside the card, not navigation. */
  it("renders no link and no href — tab state is local", () => {
    expect(tabs()).not.toContain("<a ");
    expect(tabs()).not.toContain("href");
  });
});

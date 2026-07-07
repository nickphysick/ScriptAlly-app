/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { CompTitle } from "../types";
import {
  compMedia,
  compRole,
  recencyFlag,
  queryLine,
  queryHealth,
  compCounts,
} from "./compsPage";

const NOW = 2026;

/** Terse comp factory. */
function comp(over: Partial<CompTitle> & { title: string }): CompTitle {
  return { ...over };
}

describe("compMedia", () => {
  it("defaults an absent media to book", () => {
    expect(compMedia(comp({ title: "A" }))).toBe("book");
  });
  it("passes through an explicit media", () => {
    expect(compMedia(comp({ title: "A", media: "film" }))).toBe("film");
  });
});

describe("compRole", () => {
  it("marks a recent book (≤5y) as a market comp", () => {
    expect(compRole(comp({ title: "A", media: "book", year: 2021 }), NOW).kind).toBe("market");
    expect(compRole(comp({ title: "A", media: "book", year: 2026 }), NOW).kind).toBe("market");
  });
  it("marks an older book (>5y) as a tone comp", () => {
    expect(compRole(comp({ title: "A", media: "book", year: 2020 }), NOW).kind).toBe("tone");
    expect(compRole(comp({ title: "A", media: "book", year: 2006 }), NOW).kind).toBe("tone");
  });
  it("treats a book with no year as a tone comp (can't prove a market)", () => {
    expect(compRole(comp({ title: "A", media: "book" }), NOW).kind).toBe("tone");
  });
  it("treats an absent-media comp as a book for role purposes", () => {
    expect(compRole(comp({ title: "A", year: 2021 }), NOW).kind).toBe("market");
    expect(compRole(comp({ title: "A", year: 2010 }), NOW).kind).toBe("tone");
  });
  it("always makes non-book media a tone comp regardless of year", () => {
    expect(compRole(comp({ title: "A", media: "film", year: 2025 }), NOW).kind).toBe("tone");
    expect(compRole(comp({ title: "A", media: "tv", year: 2026 }), NOW).kind).toBe("tone");
    expect(compRole(comp({ title: "A", media: "other", year: 2026 }), NOW).kind).toBe("tone");
  });
  it("names the media in the tone line for non-book comps", () => {
    expect(compRole(comp({ title: "A", media: "film" }), NOW).line).toContain("film");
  });
});

describe("recencyFlag", () => {
  it("flags an old book only when it is in the query", () => {
    expect(recencyFlag(comp({ title: "A", media: "book", year: 2010, inQuery: true }), NOW)).toBe(true);
    expect(recencyFlag(comp({ title: "A", media: "book", year: 2010, inQuery: false }), NOW)).toBe(false);
    expect(recencyFlag(comp({ title: "A", media: "book", year: 2010 }), NOW)).toBe(false);
  });
  it("never flags a recent book", () => {
    expect(recencyFlag(comp({ title: "A", media: "book", year: 2023, inQuery: true }), NOW)).toBe(false);
  });
  it("never flags non-book media, even old and in-query", () => {
    expect(recencyFlag(comp({ title: "A", media: "film", year: 2006, inQuery: true }), NOW)).toBe(false);
  });
  it("never flags a book with no year", () => {
    expect(recencyFlag(comp({ title: "A", media: "book", inQuery: true }), NOW)).toBe(false);
  });
});

describe("queryLine", () => {
  it("returns the empty prompt when nothing is in the query", () => {
    const r = queryLine([comp({ title: "A", inQuery: false }), comp({ title: "B" })]);
    expect(r.kind).toBe("empty");
    if (r.kind === "empty") expect(r.prompt).toMatch(/tick a comp/i);
  });
  it("assembles a single in-query comp with attribution", () => {
    const r = queryLine([comp({ title: "Piranesi", author: "Susanna Clarke", year: 2020, inQuery: true })]);
    expect(r.kind).toBe("line");
    if (r.kind === "line") expect(r.text).toBe("For readers of Piranesi (Clarke, 2020).");
  });
  it("joins two in-query comps with 'and'", () => {
    const r = queryLine([
      comp({ title: "A Marvellous Light", author: "Freya Marske", year: 2021, inQuery: true }),
      comp({ title: "Piranesi", author: "Susanna Clarke", year: 2020, inQuery: true }),
    ]);
    if (r.kind === "line")
      expect(r.text).toBe(
        "For readers of A Marvellous Light (Marske, 2021) and Piranesi (Clarke, 2020)."
      );
  });
  it("joins three in-query comps with commas then 'and' (Oxford-less)", () => {
    const r = queryLine([
      comp({ title: "A", author: "One Alpha", year: 2021, inQuery: true }),
      comp({ title: "B", author: "Two Beta", year: 2022, inQuery: true }),
      comp({ title: "C", author: "Three Gamma", year: 2023, inQuery: true }),
    ]);
    if (r.kind === "line")
      expect(r.text).toBe(
        "For readers of A (Alpha, 2021), B (Beta, 2022) and C (Gamma, 2023)."
      );
  });
  it("skips only-out-of-query comps and keeps shelf order", () => {
    const r = queryLine([
      comp({ title: "First", author: "AA", year: 2021, inQuery: true }),
      comp({ title: "Skip", author: "ZZ", year: 2019, inQuery: false }),
      comp({ title: "Second", author: "BB", year: 2022, inQuery: true }),
    ]);
    if (r.kind === "line") {
      expect(r.parts.map((p) => p.title)).toEqual(["First", "Second"]);
      expect(r.text).toBe("For readers of First (AA, 2021) and Second (BB, 2022).");
    }
  });
  it("degrades attribution gracefully when author/year are missing", () => {
    expect(
      (queryLine([comp({ title: "Solo", inQuery: true })]) as { text: string }).text
    ).toBe("For readers of Solo.");
    expect(
      (queryLine([comp({ title: "Yr", year: 2020, inQuery: true })]) as { text: string }).text
    ).toBe("For readers of Yr (2020).");
    expect(
      (queryLine([comp({ title: "Au", author: "Jane Doe", inQuery: true })]) as { text: string }).text
    ).toBe("For readers of Au (Doe).");
  });
});

describe("queryHealth", () => {
  const recentBook = (t: string) => comp({ title: t, media: "book", year: 2023, inQuery: true });
  const oldBook = (t: string) => comp({ title: t, media: "book", year: 2008, inQuery: true });

  it("is empty when nothing is in the query", () => {
    expect(queryHealth([comp({ title: "A" })], NOW).status).toBe("empty");
  });
  it("is ok/strong at two or more recent books in-query", () => {
    expect(queryHealth([recentBook("A"), recentBook("B")], NOW).status).toBe("ok");
    expect(queryHealth([recentBook("A"), recentBook("B"), recentBook("C")], NOW).status).toBe("ok");
  });
  it("is ok/solid at exactly one recent book in-query", () => {
    const r = queryHealth([recentBook("A"), oldBook("B")], NOW);
    expect(r.status).toBe("ok");
    expect(r.text).toMatch(/solid/i);
  });
  it("tips when in-query comps have no recent book", () => {
    expect(queryHealth([oldBook("A"), comp({ title: "F", media: "film", year: 2025, inQuery: true })], NOW).status).toBe("tip");
  });
});

describe("compCounts", () => {
  it("counts total and in-query", () => {
    expect(
      compCounts([
        comp({ title: "A", inQuery: true }),
        comp({ title: "B", inQuery: false }),
        comp({ title: "C", inQuery: true }),
      ])
    ).toEqual({ total: 3, inQuery: 2 });
  });
});

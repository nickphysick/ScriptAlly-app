/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { CompTitle } from "../types";
import {
  compMedia,
  compRole,
  compAge,
  queryLine,
  compositionLine,
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

  /**
   * ⚠️ THE LINES STATE, THEY DO NOT APPRAISE (baked decision 17). Asserted as a BAN LIST rather than
   * as four exact strings, so a future rewording cannot smuggle a judgement back in under new
   * wording — which is what "reworded, not deleted" would have allowed.
   */
  it("carries no adjective about the writer's choice, in any branch", () => {
    const banned = /\b(perfect|strong|solid|weak|great|good|poor|best|enough|ideal|should|just|simply)\b/i;
    const lines = [
      compRole(comp({ title: "A", media: "film" }), NOW).line,
      compRole(comp({ title: "A", media: "book", year: 2024 }), NOW).line,
      compRole(comp({ title: "A", media: "book", year: 2001 }), NOW).line,
      compRole(comp({ title: "A", media: "book" }), NOW).line,
    ];
    for (const line of lines) expect(line, `"${line}" appraises`).not.toMatch(banned);
  });

  /**
   * ⚠️ A CORRECTNESS FIX, NOT A REWORDING. The yearless book shared the older-book line, so a comp
   * with NO year recorded was told it had been published more than five years ago — a claim the
   * data cannot support.
   */
  it("never tells a yearless book when it was published", () => {
    const line = compRole(comp({ title: "A", media: "book" }), NOW).line;
    expect(line).toBe("No publication year recorded.");
    expect(compRole(comp({ title: "A", media: "book", year: 2001 }), NOW).line)
      .toBe("Published more than five years ago.");
  });
});

describe("compAge", () => {
  /**
   * ⚠️ IT RETURNS THE NUMBER, because the chip states the number. A boolean could only ever produce
   * a verdict ("Old for a market comp") — the shape left nothing else to say.
   */
  it("gives the age of a book older than five years", () => {
    expect(compAge(comp({ title: "A", media: "book", year: 2010 }), NOW)).toBe(16);
    expect(compAge(comp({ title: "A", media: "book", year: 2020 }), NOW)).toBe(6);
  });

  it("is null at exactly five years and younger — the chip simply omits itself", () => {
    expect(compAge(comp({ title: "A", media: "book", year: 2021 }), NOW)).toBeNull();
    expect(compAge(comp({ title: "A", media: "book", year: 2026 }), NOW)).toBeNull();
  });

  /**
   * ⚠️ THE `inQuery` GATE IS GONE, deliberately. It fired only on a ticked comp, on the reasoning
   * that it was "being asked to carry a market case it can't" — reasoning that is itself an
   * appraisal. An age is a fact about the book either way.
   */
  it("does not care whether the comp is ticked", () => {
    expect(compAge(comp({ title: "A", media: "book", year: 2010, inQuery: true }), NOW)).toBe(16);
    expect(compAge(comp({ title: "A", media: "book", year: 2010, inQuery: false }), NOW)).toBe(16);
  });

  it("is null for non-book media and for a book with no year", () => {
    expect(compAge(comp({ title: "A", media: "film", year: 2006 }), NOW)).toBeNull();
    expect(compAge(comp({ title: "A", media: "book" }), NOW)).toBeNull();
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

describe("compositionLine", () => {
  const recentBook = (t: string) => comp({ title: t, media: "book", year: 2023, inQuery: true });
  const oldBook = (t: string) => comp({ title: t, media: "book", year: 2008, inQuery: true });

  it("is null when nothing is ticked — there is no composition to state", () => {
    expect(compositionLine([comp({ title: "A" })], NOW)).toBeNull();
    expect(compositionLine([], NOW)).toBeNull();
  });

  it("counts the recent books against every ticked comp", () => {
    expect(compositionLine([recentBook("A"), recentBook("B"), oldBook("C")], NOW))
      .toBe("2 of 3 published in the last five years");
    expect(compositionLine([oldBook("A")], NOW)).toBe("0 of 1 published in the last five years");
  });

  /**
   * ⚠️ THE DENOMINATOR IS EVERY TICKED COMP, films included. It keeps the sentence true (the film is
   * not published in the last five years) AND keeps the total agreeing with the `BUILT FROM N
   * TICKED COMPS` beside it. A books-only denominator would silently disagree with its own caption.
   */
  it("counts a ticked film in the total and never in the count", () => {
    const film = comp({ title: "F", media: "film", year: 2025, inQuery: true });
    expect(compositionLine([recentBook("A"), film], NOW)).toBe("1 of 2 published in the last five years");
  });

  it("ignores unticked comps entirely", () => {
    const untickedRecent = comp({ title: "U", media: "book", year: 2024 });
    expect(compositionLine([recentBook("A"), untickedRecent], NOW))
      .toBe("1 of 1 published in the last five years");
  });

  /**
   * ⚠️ THE POINT OF DELETING `queryHealth` RATHER THAN REWORDING IT. Its verdict lived in its TYPE
   * (`status: "empty" | "ok" | "tip"`), so every consumer inherited the judgement whatever the copy
   * said. This asserts the replacement states a fact and recommends nothing.
   */
  it("never appraises, never recommends, never states a threshold", () => {
    const banned = /\b(strong|solid|weak|current case|anchoring|add one|should|need|try|good|poor|only|just)\b/i;
    for (const comps of [[recentBook("A"), recentBook("B")], [recentBook("A"), oldBook("B")], [oldBook("A")]]) {
      const line = compositionLine(comps, NOW)!;
      expect(line, `"${line}" appraises`).not.toMatch(banned);
    }
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

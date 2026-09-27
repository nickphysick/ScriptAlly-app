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
  compAgeLine,
  queryLine,
  compositionLine,
  compCounts,
  ordinal,
  spineInitial,
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

describe("queryLine (comps v2 — the mock's copy)", () => {
  const MS = "Murphy's Day Out";
  const on = (title: string, over: Partial<CompTitle> = {}) =>
    comp({ title, inQuery: true, media: "book", year: 2024, ...over });
  const text = (r: ReturnType<typeof queryLine>) => (r.kind === "line" ? r.text : r.prompt);

  it("prompts identically in both formats when nothing is switched on", () => {
    for (const f of ["readers", "meets"] as const) {
      const r = queryLine([comp({ title: "A" })], MS, f);
      expect(r.kind).toBe("empty");
      expect(text(r)).toBe("Switch on In query letter for a comp to start your line.");
      expect(r.caption).toBe("Switch on “In query letter” for a comp below");
    }
  });

  it("names the manuscript and joins the titles, no attributions, no Oxford comma", () => {
    expect(text(queryLine([on("The Appeal"), on("Magpie Murders"), on("A Tidy Ending")], MS, "readers")))
      .toBe("Murphy's Day Out will appeal to readers of The Appeal, Magpie Murders and A Tidy Ending.");
    expect(text(queryLine([on("Solo")], MS, "readers"))).toBe("Murphy's Day Out will appeal to readers of Solo.");
    expect(text(queryLine([on("A"), on("B")], MS, "readers"))).toBe("Murphy's Day Out will appeal to readers of A and B.");
  });

  it("marks the manuscript and the comp titles — the runs the page sets in italic — and nothing else", () => {
    const r = queryLine([on("The Appeal")], MS, "readers");
    if (r.kind !== "line") throw new Error("expected a line");
    expect(r.segments.filter((x) => x.emphasis).map((x) => [x.emphasis, x.text])).toEqual([["ms", MS], ["title", "The Appeal"]]);
  });

  /* ⚠️ C1 — LIST ORDER, and a reorder changes the line. Built from two orders of the SAME comps, so
     a sort of any kind (title, year, insertion) produces one sentence for both and fails. */
  it("C1 · follows the switches in LIST ORDER, and reordering changes the line", () => {
    const a = on("Zebra", { year: 1999 }), b = comp({ title: "Skip" }), c = on("Apple", { year: 2025 });
    expect(text(queryLine([a, b, c], MS, "readers"))).toBe("Murphy's Day Out will appeal to readers of Zebra and Apple.");
    expect(text(queryLine([c, b, a], MS, "readers"))).toBe("Murphy's Day Out will appeal to readers of Apple and Zebra.");
    expect(text(queryLine([a, c], MS, "meets"))).toBe("Zebra meets Apple.");
    expect(text(queryLine([c, a], MS, "meets"))).toBe("Apple meets Zebra.");
  });

  it("C1 · A meets B at any count but two states the rule and the count, agreeing in number", () => {
    const r1 = queryLine([on("T0")], MS, "meets");
    expect(r1.kind).toBe("unavailable");
    expect(text(r1)).toBe("“A meets B” takes exactly two comps. 1 is switched on.");
    const r3 = queryLine([on("T0"), on("T1"), on("T2")], MS, "meets");
    expect(text(r3)).toBe("“A meets B” takes exactly two comps. 3 are switched on.");
    expect(r3.caption).toBe("Switch on “In query letter” for a comp below");
  });

  it("the caption says how the line was built — count, singular, list order — and nothing else", () => {
    expect(queryLine([on("A"), on("B"), on("C", { year: 2001 })], MS, "readers").caption)
      .toBe("Built from 3 comps switched on below, in list order");
    expect(queryLine([on("A")], MS, "readers").caption).toBe("Built from 1 comp switched on below, in list order");
    expect(queryLine([on("A"), on("B")], MS, "meets").caption).toBe("Built from 2 comps switched on below, in list order");
  });
});

describe("compositionLine (the library fact under Your comps)", () => {
  const book = (t: string, year?: number, over: Partial<CompTitle> = {}) => comp({ title: t, media: "book", year, ...over });

  it("counts books against books, and screen comps as their own clause — switched on or not", () => {
    const lib = [book("A", 2021), book("B", 2023, { inQuery: true }), comp({ title: "T", media: "tv", year: 2022 }), book("C", 2024), book("D", 2019)];
    expect(compositionLine(lib, NOW)).toBe("3 of 4 books published in the last five years · 1 film or TV");
  });

  it("omits a part whose count is 0, agrees in number, and is null for an empty list", () => {
    expect(compositionLine([book("A", 2025)], NOW)).toBe("1 of 1 book published in the last five years");
    expect(compositionLine([comp({ title: "F", media: "film", year: 2025 })], NOW)).toBe("1 film or TV");
    expect(compositionLine([], NOW)).toBeNull();
  });

  it("an absent media reads as a book; a book with no year is counted and not recent", () => {
    expect(compositionLine([comp({ title: "X" }), book("Y")], NOW)).toBe("0 of 2 books published in the last five years");
  });

  it("C6 · never appraises, recommends or states a threshold to fall short of", () => {
    const banned = /\b(strong|solid|weak|dated|outdated|old|should|need|try|good|poor|only|just|enough)\b/i;
    for (const lib of [[book("A", 2025)], [book("A", 2001)], [book("A", 2025), comp({ title: "T", media: "tv" })]]) {
      const line = compositionLine(lib, NOW)!;
      expect(line, `"${line}" appraises`).not.toMatch(banned);
    }
  });
});

describe("compAgeLine (comps v2)", () => {
  it("C6 · states the year and the elapsed count in numerals, for every media", () => {
    expect(compAgeLine(comp({ title: "A", year: 2021 }), NOW)).toBe("2021 · 5 years ago");
    expect(compAgeLine(comp({ title: "A", year: 2025 }), NOW)).toBe("2025 · 1 year ago");
    expect(compAgeLine(comp({ title: "A", year: 2026 }), NOW)).toBe("2026 · this year");
    expect(compAgeLine(comp({ title: "A", year: 2027 }), NOW)).toBe("2027 · this year");
    expect(compAgeLine(comp({ title: "T", year: 2019, media: "tv" }), NOW)).toBe("2019 · 7 years ago");
    expect(compAgeLine(comp({ title: "A", year: 1970 }), NOW)).toBe("1970 · 56 years ago");
  });

  it("states an absent year rather than omitting the row", () => {
    expect(compAgeLine(comp({ title: "A" }), NOW)).toBe("Year not recorded");
  });

  /* ⚠️ THE SAME SHAPE AT EVERY AGE — a line whose wording changes past some number is a flag. */
  it("C6 · no cutoff: one template whatever the age", () => {
    const shapes = new Set([1990, 2000, 2010, 2019, 2020, 2021, 2022, 2024].map((y) => compAgeLine(comp({ title: "A", year: y }), NOW).replace(/\d+/g, "N")));
    expect([...shapes]).toEqual(["N · N years ago"]);
  });
});

describe("ordinal and spineInitial", () => {
  it("ordinal", () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal))
      .toEqual(["1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
  it("spineInitial sets a leading The / A / An aside", () => {
    expect(["The Tidewater Line", "Salt Road", "A Tidy Ending", "An Echo", "the appeal", "Anne", "  ", "The"].map(spineInitial))
      .toEqual(["T", "S", "T", "E", "A", "A", "·", "T"]);
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

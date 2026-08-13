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
  const MS = "Murphy's Day Out";
  const tick = (title: string, over: Partial<CompTitle> = {}) =>
    comp({ title, inQuery: true, media: "book", year: 2024, ...over });
  const text = (r: ReturnType<typeof queryLine>) => (r.kind === "line" ? r.text : "");
  const cap = (r: ReturnType<typeof queryLine>) => (r.kind === "empty" ? r.caption : r.caption);

  it("prompts identically in both formats when nothing is ticked", () => {
    for (const f of ["readers", "meets"] as const) {
      const r = queryLine([comp({ title: "A" })], MS, f, NOW);
      expect(r.kind).toBe("empty");
      if (r.kind === "empty") {
        expect(r.prompt).toMatch(/tick a comp/i);
        expect(r.caption).toBeNull();
      }
    }
  });

  /**
   * ⚠️ THE WORDING IS THE PACK'S AND IT CHANGED. This file used to produce "For readers of A
   * (Clarke, 2020)." from the earlier flat ref; Phase 2 and the v5 ref both name the MANUSCRIPT in
   * the sentence and drop the parenthetical attributions.
   */
  it("names the manuscript and joins the ticked titles, no attributions", () => {
    const r = queryLine([tick("The Appeal"), tick("Magpie Murders"), tick("A Tidy Ending")], MS, "readers", NOW);
    expect(text(r)).toBe(
      "Murphy's Day Out will appeal to readers of The Appeal, Magpie Murders and A Tidy Ending."
    );
  });

  it("uses one title, and two joined by 'and', without an Oxford comma", () => {
    expect(text(queryLine([tick("Solo")], MS, "readers", NOW)))
      .toBe("Murphy's Day Out will appeal to readers of Solo.");
    expect(text(queryLine([tick("A"), tick("B")], MS, "readers", NOW)))
      .toBe("Murphy's Day Out will appeal to readers of A and B.");
  });

  /**
   * ⚠️ WEIGHT IS THE ONLY EMPHASIS DEVICE — baked decision 2, an explicit correction. The segments
   * carry `ms` / `title` and nothing else; there is no colour or italic channel to misuse.
   */
  it("marks the manuscript and the comp titles for weight, and nothing else", () => {
    const r = queryLine([tick("The Appeal")], MS, "readers", NOW);
    if (r.kind !== "line") throw new Error("expected a line");
    expect(r.segments.find((x) => x.emphasis === "ms")?.text).toBe(MS);
    expect(r.segments.filter((x) => x.emphasis === "title").map((x) => x.text)).toEqual(["The Appeal"]);
    expect(r.segments.every((x) => x.emphasis === undefined || x.emphasis === "ms" || x.emphasis === "title")).toBe(true);
  });

  it("skips unticked comps and keeps LIST ORDER, never a sort of its own", () => {
    const r = queryLine(
      [tick("First"), comp({ title: "Skip" }), tick("Second", { year: 1999 })],
      MS, "readers", NOW
    );
    expect(text(r)).toBe("Murphy's Day Out will appeal to readers of First and Second.");
  });

  describe("the X-meets-Y format", () => {
    it("composes from exactly two", () => {
      const r = queryLine([tick("A"), tick("B")], MS, "meets", NOW);
      expect(text(r)).toBe("A meets B.");
    });

    /** ⚠️ STATES THE RULE AND THE COUNT — no instruction, no "only", no scolding. */
    it("states the rule and how many are ticked at any other count", () => {
      for (const n of [1, 3]) {
        const r = queryLine(Array.from({ length: n }, (_, i) => tick(`T${i}`)), MS, "meets", NOW);
        expect(r.kind).toBe("unavailable");
        if (r.kind === "unavailable") {
          expect(r.prompt).toBe("The X-meets-Y format takes exactly two comps.");
          expect(r.caption).toBe(`${n} ticked`);
        }
      }
    });
  });

  describe("the caption", () => {
    it("states the count, the ordering rule and the composition, in that order", () => {
      const r = queryLine([tick("A"), tick("B"), tick("C", { year: 2001 })], MS, "readers", NOW);
      expect(cap(r)).toBe("built from 3 ticked comps · in list order · 2 of 3 published in the last five years");
    });

    it("agrees in singular", () => {
      expect(cap(queryLine([tick("A")], MS, "readers", NOW)))
        .toBe("built from 1 ticked comp · in list order · 1 of 1 published in the last five years");
    });

    /** X-meets-Y has no ordering to state — two comps have no arrangement worth naming. */
    it("drops the ordering clause in the meets format", () => {
      expect(cap(queryLine([tick("A"), tick("B")], MS, "meets", NOW)))
        .toBe("built from 2 ticked comps · 2 of 2 published in the last five years");
    });

    /** ⚠️ THE CAPTION AGREES WITH ITSELF: the composition's denominator is the same ticked count. */
    it("uses one ticked count for both clauses, films included", () => {
      const r = queryLine([tick("A"), tick("F", { media: "film" })], MS, "readers", NOW);
      expect(cap(r)).toBe("built from 2 ticked comps · in list order · 1 of 2 published in the last five years");
    });
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

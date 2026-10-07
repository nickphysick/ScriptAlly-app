/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactStrip — Contact list v13 §3 / §10: the five figures, from the agent set the list shows
 * before filtering.
 */
import { describe, it, expect } from "vitest";
import type { Agent } from "../types";
import { SubmissionStatus } from "../types";
import { fitsGenre, statedWeeks, stripFacts } from "./contactStrip";
import { formatDate } from "./dates";

/* the house formatter, never a literal: ICU says "Sep" in node and "Sept" in Chrome */
const dm = (iso: string) => formatDate(new Date(iso), { day: "numeric", month: "short" });

const NOW = Date.UTC(2026, 9, 15, 12); // 15 Oct 2026
let n = 0;
const ag = (p: Partial<Agent>): Agent => ({
  id: `a${++n}`, name: `Agent ${n}`, agency: "", genres: [], submissionStatus: SubmissionStatus.OPEN,
  dateAdded: "2026-01-10T10:00:00.000Z", ...p,
} as Agent);

describe("statedWeeks — the stub 0 and an absent value are both not stated", () => {
  it("only a positive number counts", () => {
    expect(statedWeeks({ responseTimeWeeks: 6 })).toBe(6);
    expect(statedWeeks({ responseTimeWeeks: 0 })).toBeNull();
    expect(statedWeeks({ responseTimeWeeks: undefined })).toBeNull();
  });
});

describe("stripFacts", () => {
  const A = [
    ag({ name: "Tom Ellery", agency: "Ellery & Finch", genres: ["Thriller", "Crime"], responseTimeWeeks: 4, dateAdded: "2026-10-02T09:00:00.000Z" }),
    ag({ name: "Anita Rao", agency: "Goldstein & Hart", genres: ["Thriller"], responseTimeWeeks: 4, dateAdded: "2026-10-09T09:00:00.000Z" }),
    ag({ name: "Kwame Mensah", agency: "Hartwell & Rowe", genres: ["Crime"], responseTimeWeeks: 6, dateAdded: "2026-09-12T09:00:00.000Z" }),
    ag({ name: "Sylvie Laurent", agency: "ellery & finch ", genres: ["Suspense"], responseTimeWeeks: 8, submissionStatus: SubmissionStatus.CLOSED, dateAdded: "2026-07-20T09:00:00.000Z" }),
    ag({ name: "Felix Underwood", agency: "Underwood Agency", responseTimeWeeks: 0, dateAdded: "2026-05-03T09:00:00.000Z" }),
    ag({ name: "Zoe Kaminski", agency: "", genres: ["Literary"], dateAdded: "2025-12-01T09:00:00.000Z" }),
  ];
  const f = stripFacts(A, ["Thriller"], NOW);

  it("On file: every agent, and agencies counted once, case- and space-blind, nameless ones out", () => {
    expect(f.onFile).toBe(6);
    expect(f.agencies).toBe(4);
  });

  it("the sparkline: six calendar months, the current one LAST", () => {
    /* May, Jun, Jul, Aug, Sep, Oct — December 2025 falls outside the six */
    expect(f.spark).toEqual([1, 0, 1, 0, 1, 2]);
  });

  it("Fit your book: agents whose genres include the manuscript's, queried or not; the line is the plural", () => {
    expect(f.fit).toBe(2);
    expect(f.fitLine).toBe("take thrillers");
    expect(stripFacts(A, [], NOW).fitLine).toBeNull();
    expect(stripFacts(A, [], NOW).fit).toBe(0);
  });

  it("Open now: not Closed; the line counts the closed", () => {
    expect(f.open).toBe(5);
    expect(f.closed).toBe(1);
  });

  it("Typical reply: the MEDIAN of stated windows, the stub 0 and absent values excluded", () => {
    /* stated: 4, 4, 6, 8 → median (4 + 6) / 2 = 5 */
    expect(f.medianWeeks).toBe(5);
    expect(stripFacts(A.slice(0, 3), ["Thriller"], NOW).medianWeeks).toBe(4);
    expect(stripFacts([A[4], A[5]], ["Thriller"], NOW).medianWeeks).toBeNull();
  });

  it("the fastest: the lowest window, a tie broken by name", () => {
    expect(f.fastest).toEqual({ name: "Anita Rao", weeks: 4 });
    expect(stripFacts([A[4], A[5]], ["Thriller"], NOW).fastest).toBeNull();
  });

  it("Added this month: by dateAdded in the current calendar month; last is the newest overall", () => {
    expect(f.addedThisMonth).toBe(2);
    expect(f.last).toEqual({ name: "Anita Rao", date: dm("2026-10-09T09:00:00.000Z") });
    const none = stripFacts(A.slice(2), ["Thriller"], NOW);
    expect(none.addedThisMonth).toBe(0);
    expect(none.last).toEqual({ name: "Kwame Mensah", date: dm("2026-09-12T09:00:00.000Z") });
  });

  /* v14 (ruling Q5): the book's main genre OR any subGenre, compared by canonical key */
  it("fitsGenre: the main genre or any subGenre, by canonical key", () => {
    expect(fitsGenre(A[0], ["Thriller"])).toBe(true);
    expect(fitsGenre(A[2], ["Thriller"])).toBe(false);
    expect(fitsGenre(A[2], ["Thriller", "Crime"]), "a subGenre is enough").toBe(true);
    expect(fitsGenre(A[0], []), "no book, no claim").toBe(false);
    /* the old lower-case comparison failed this: a stored id against a manuscript's label */
    expect(fitsGenre(ag({ genres: ["science-fiction"] }), ["Science fiction"])).toBe(true);
    expect(fitsGenre(ag({ genres: ["crime fiction"] }), ["Crime"]), "an alias is the genre").toBe(true);
  });
  it("the Fit line names every genre of the book, joined with 'or'", () => {
    expect(stripFacts(A, ["Thriller", "Crime"], NOW).fitLine).toBe("take thrillers or crime");
    expect(stripFacts(A, ["Thriller", "Crime"], NOW).fit).toBe(3);
  });
});

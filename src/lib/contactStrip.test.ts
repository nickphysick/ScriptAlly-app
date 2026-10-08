/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactStrip — the two facts it still holds (a stated reply window, and whether an agent takes the book). The
 * strip's own figures retired in Contact list v15 §3.
 */
import { describe, it, expect } from "vitest";
import type { Agent } from "../types";
import { SubmissionStatus } from "../types";
import { fitsGenre, statedWeeks } from "./contactStrip";

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

/* ⚠️ RETIRED (Contact list v15 §3): "stripFacts" — deleted with the strip. Its fitsGenre case stays, below. */
describe("fitsGenre", () => {
  const A = [
    ag({ name: "Tom Ellery", genres: ["Thriller", "Crime"] }),
    ag({ name: "Anita Rao", genres: ["Thriller"] }),
    ag({ name: "Kwame Mensah", genres: ["Crime"] }),
  ];
  it("the main genre or any subGenre, by canonical key", () => {
    expect(fitsGenre(A[0], ["Thriller"])).toBe(true);
    expect(fitsGenre(A[2], ["Thriller"])).toBe(false);
    expect(fitsGenre(A[2], ["Thriller", "Crime"]), "a subGenre is enough").toBe(true);
    expect(fitsGenre(A[0], []), "no book, no claim").toBe(false);
    /* the old lower-case comparison failed this: a stored id against a manuscript's label */
    expect(fitsGenre(ag({ genres: ["science-fiction"] }), ["Science fiction"])).toBe(true);
    expect(fitsGenre(ag({ genres: ["crime fiction"] }), ["Crime"]), "an alias is the genre").toBe(true);
  });
});

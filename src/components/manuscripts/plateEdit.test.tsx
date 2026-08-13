/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the plate's inline editors — the pure helpers, and the two render modes.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ManuscriptPlate, ManuscriptPlateProps, ManuscriptPlateEdit } from "./ManuscriptPlate";
import {
  parseWordCount,
  stepWordCount,
  genreList,
  splitGenres,
  WORD_STEP,
  WORD_COUNT_HINT,
  WORD_COUNT_REJECTED,
  MAX_MANUSCRIPT_GENRES,
} from "./plateEdit";
import { commonGenresFor, COMMON_GENRES_BY_AGE, canonicalGenreById } from "../../lib/genres";

const noop = () => {};
const BASE: ManuscriptPlateProps = {
  title: "Murphy's Day Out",
  status: "Querying",
  genres: ["Young Adult", "Thriller"],
  wordCount: 50000,
  logline: "Murphy catches a fly",
  stats: { queriesSent: 4, responses: 1, lastActivity: "8 Aug" },
};

const EDIT: ManuscriptPlateEdit = {
  onTitle: noop,
  onWordCount: noop,
  onLogline: noop,
  genre: {
    ageCategory: "Young Adult",
    ids: ["thriller"],
    personal: [],
    onCreatePersonal: async () => ({ ok: false, reason: "x" }),
    onSave: noop,
  },
};

const plate = (over: Partial<ManuscriptPlateProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptPlate, { ...BASE, ...over }));

describe("a word count is a number the writer types, and nothing suggests one", () => {
  /**
   * ⚠️ THE RANGE GUIDANCE IS RETIRED — no typical range, no placeholder range, no target, anywhere
   * this pass reaches. The creation form and onboarding still carry `genreWordCountRange`; those are
   * outside this file set and the retirement there is REPORTED, not silently done.
   */
  it("offers no range, and its own hint constant is null so nothing can render one", () => {
    expect(WORD_COUNT_HINT).toBeNull();
    const html = plate({ edit: EDIT });
    expect(html).not.toMatch(/\b(typical|usually|aim|target|recommended|should be)\b/i);
    expect(html).not.toMatch(/\d{2},\d{3}\s*[–-]\s*\d{2,3},\d{3}/);
  });

  it("parses a plain number", () => {
    expect(parseWordCount("50000")).toBe(50000);
    expect(parseWordCount("0")).toBe(0);
  });

  /* The field PRINTS "50,000", so a writer retyping what they see must not be rejected by it. */
  it("accepts the separators the plate itself renders", () => {
    expect(parseWordCount("50,000")).toBe(50000);
    expect(parseWordCount(" 84 000 ")).toBe(84000);
  });

  it("rejects anything that is not a number, and says so in one line", () => {
    for (const bad of ["abc", "50k", "12.5", "-400", ""]) expect(parseWordCount(bad)).toBeNull();
    expect(WORD_COUNT_REJECTED).toBe("Word count is a number.");
    /* States what is wrong; asks for nothing and blames nobody. */
    expect(WORD_COUNT_REJECTED).not.toMatch(/\b(you|your|please|try|must|should)\b/i);
  });

  /* An empty field is not zero — a writer clearing it has not said the manuscript is empty. */
  it("treats an empty field as no answer rather than as zero", () => {
    expect(parseWordCount("")).toBeNull();
    expect(parseWordCount("   ")).toBeNull();
  });

  it("steps from the current value, and floors at zero", () => {
    expect(stepWordCount(50000, WORD_STEP)).toBe(50500);
    expect(stepWordCount(50000, -WORD_STEP)).toBe(49500);
    expect(stepWordCount(200, -WORD_STEP)).toBe(0);
  });
});

describe("the genre list joins `genre` and `subGenres`, in one place", () => {
  it("puts the primary first", () => {
    expect(genreList("thriller", ["crime"])).toEqual(["thriller", "crime"]);
    expect(genreList("thriller")).toEqual(["thriller"]);
    expect(genreList("", [])).toEqual([]);
  });

  it("splits back, primary first", () => {
    expect(splitGenres(["thriller", "crime"])).toEqual({ genre: "thriller", subGenres: ["crime"] });
    expect(splitGenres([])).toEqual({ genre: "", subGenres: [] });
  });

  it("round-trips", () => {
    const { genre, subGenres } = splitGenres(["a", "b", "c"]);
    expect(genreList(genre, subGenres)).toEqual(["a", "b", "c"]);
  });

  it("caps at three", () => {
    expect(MAX_MANUSCRIPT_GENRES).toBe(3);
  });
});

describe("the age-category shortcuts are a shortcut, not a constraint", () => {
  it("names real canonical genres for every category", () => {
    for (const [age, ids] of Object.entries(COMMON_GENRES_BY_AGE)) {
      expect(ids.length, `${age} has no shortcuts`).toBeGreaterThan(0);
      for (const id of ids) {
        expect(canonicalGenreById(id), `${age} names "${id}", which is not a canonical genre`).toBeDefined();
      }
    }
  });

  /* An unknown category offers nothing rather than the wrong thing. */
  it("yields nothing for a category it does not know", () => {
    expect(commonGenresFor("Graphic Novel")).toEqual([]);
    expect(commonGenresFor(undefined)).toEqual([]);
  });

  /**
   * ⚠️ IT MUST NEVER BECOME A FILTER. Every canonical genre stays reachable by typing for every
   * category — a Middle Grade horror is a real book. Asserted by pointing at a genre that appears in
   * no shortcut list at all and confirming it is still canonical.
   */
  it("leaves every genre reachable — the lists are not the taxonomy", () => {
    const shortlisted = new Set(Object.values(COMMON_GENRES_BY_AGE).flat());
    expect(shortlisted.has("horror")).toBe(false);
    expect(canonicalGenreById("horror")).toBeDefined();
  });
});

describe("editing is opt-in — the plate is read-only without it", () => {
  it("renders no editor affordances when `edit` is absent", () => {
    const html = plate();
    expect(html).not.toContain("editable");
    expect(html).not.toContain("msv-titleinput");
    expect(html).toContain("Murphy&#x27;s Day Out");
  });

  it("and marks title, genre, word count and logline editable when it is present", () => {
    const html = plate({ edit: EDIT });
    expect(html).toContain("msv-platetitle editable");
    expect(html).toContain("msv-gp editable");
    expect(html).toContain("msv-wc editable");
    expect(html).toContain("msv-platelog editable");
  });

  /* Each editable target is one control with one accessible name. */
  it("names what each control edits", () => {
    const html = plate({ edit: EDIT });
    expect(html).toContain('aria-label="Edit title — Murphy&#x27;s Day Out"');
    expect(html).toContain('aria-label="Edit word count — 50,000 words"');
  });

  /**
   * ⚠️ THE LOGLINE IS NOT EDITED HERE. It is a pitch-shelf asset, so the plate's control jumps to
   * the shelf instead of opening an editor — one home per asset. There is no logline input on this
   * component, in either mode.
   */
  it("gives the logline a jump, never an editor", () => {
    const src = readFileSync(resolve(__dirname, "./ManuscriptPlate.tsx"), "utf8");
    expect(src).not.toMatch(/aria-label="Logline"/);
    expect(src).toContain("edit.onLogline");
    expect(plate({ edit: EDIT })).toContain("msv-platelog editable");
  });

  /* The genre editor renders the age row only when opened, so the resting plate stays a plate. */
  it("keeps the genre editor closed at rest", () => {
    expect(plate({ edit: EDIT })).not.toContain("msv-ageseg");
  });
});

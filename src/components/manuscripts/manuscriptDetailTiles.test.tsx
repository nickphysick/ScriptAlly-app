/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Details pane — the four illustrated tiles and the copy they derive.
 *
 * The copy assertions matter more than the markup ones here. Every tile states a fact about the
 * writer's book, and the two ways to get that wrong are both silent: printing a `0`/`undefined`
 * where "nothing yet" is the truth, and appraising ("only four queries", "already seven weeks")
 * where the app is meant to report.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManuscriptDetailTiles } from "./ManuscriptDetailTiles";
import {
  outInTheWorld, comparableTitlesTile, onTheShelf, submissionMaterials,
  elapsedPhrase, spellCount, sinceDate,
} from "../../lib/manuscriptTiles";
import { pitchLine } from "../../lib/comps";
import {
  Query, QueryStatus, ManuscriptStatus, ComponentType,
  SubmissionPackage, ManuscriptVersion, CompTitle,
} from "../../types";

const q = (over: Partial<Query> = {}): Query =>
  ({
    id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
    status: QueryStatus.QUERIED, dateSent: "2026-06-20T00:00:00.000Z",
    personalisationNotes: "", sendMethod: "Email", ...over,
  } as Query);

const ver = (t: ComponentType, id: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: t, versionName: id, fileAttached: false, createdDate: "2026-06-01" } as ManuscriptVersion);

const pkg = (id: string): SubmissionPackage =>
  ({ id, manuscriptId: "m1", userId: "u", packageName: id, queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "", status: "Active", createdDate: "2026-06-01" } as SubmissionPackage);

const comp = (title: string, year?: number): CompTitle => ({ title, year });

const NOW = Date.parse("2026-08-08T00:00:00.000Z");

/* ── tile 1 ─────────────────────────────────────────────────────────────────────────────────── */

describe("tile 1 — Out in the world", () => {
  it("at zero: states it hasn't gone out, and never '0 queries'", () => {
    const t = outInTheWorld([]);
    expect(t.headline).toBe("No queries sent yet");
    expect(t.detail).toBe("This one hasn't gone out yet.");
    expect(t.headline).not.toContain("0");
  });

  it("at one: singular", () => {
    expect(outInTheWorld([q()]).headline).toBe("1 query with agents");
  });

  it("at many: plural", () => {
    expect(outInTheWorld([q(), q({ id: "b" }), q({ id: "c" })]).headline).toBe("3 queries with agents");
  });

  it("queries sent but nothing back: says so, rather than omitting the line", () => {
    expect(outInTheWorld([q(), q({ id: "b" })]).detail).toBe("No responses yet.");
  });

  it("with a response: counts it and dates it", () => {
    const t = outInTheWorld([q(), q({ id: "b", status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-08-08T00:00:00.000Z" })]);
    expect(t.detail).toContain("One response so far");
    expect(t.detail).toContain("8 August");
  });

  /** ⚠️ An undated response is still a response. Keep the count, drop the date — never invent one. */
  it("an undated response keeps its count and states no date", () => {
    const t = outInTheWorld([q({ dateSent: undefined, hasAgentResponded: true } as Partial<Query>)]);
    expect(t.detail).toBe("One response so far.");
  });
});

/* ── tile 2 ─────────────────────────────────────────────────────────────────────────────────── */

describe("tile 2 — Comparable titles", () => {
  it("at zero: nothing on the shelf, and the line is explained not urged", () => {
    const t = comparableTitlesTile([]);
    expect(t.headline).toBe("Nothing on the shelf yet");
    expect(t.pitch.kind).toBe("none");
    expect(t.detail).toBe("Two comps make the ‘X meets Y’ line in a query letter.");
  });

  it("at one: the title, plus what a second would complete", () => {
    const t = comparableTitlesTile([comp("Stormbreak")]);
    expect(t.headline).toBe("1 on the shelf");
    expect(t.pitch).toEqual({ kind: "one", a: "Stormbreak" });
  });

  it("at two or more: the composed pitch, and no accompanying prose", () => {
    const t = comparableTitlesTile([comp("Stormbreak"), comp("A Good Girl's Guide to Murder"), comp("Third")]);
    expect(t.headline).toBe("3 on the shelf");
    expect(t.pitch).toEqual({ kind: "two", a: "Stormbreak", b: "A Good Girl's Guide to Murder" });
    expect(t.detail).toBeNull();
  });

  /**
   * ⚠️ THE PITCH IS `pitchLine` FROM lib/comps — the SHELF'S OWN composition, not a second one.
   * Two compositions would eventually disagree about which comps make the line, and the tile and
   * the shelf would print different pitches for one book.
   */
  it("delegates composition to pitchLine rather than reimplementing it", () => {
    const comps = [comp("A"), comp("B"), comp("C")];
    expect(comparableTitlesTile(comps).pitch).toEqual(pitchLine(comps));
  });

  it("and the rendered pitch italicises both titles", () => {
    const html = tiles({ comps: comparableTitlesTile([comp("Stormbreak"), comp("Nightjar")]) });
    expect(html).toContain("<i>Stormbreak</i> meets <i>Nightjar</i>.");
  });
});

/* ── tile 3 ─────────────────────────────────────────────────────────────────────────────────── */

describe("tile 3 — On the shelf", () => {
  /**
   * ⚠️ THE HEADLINE IS THE STATUS FACT, NOT "Added". `createdDate` is optional and the current
   * create path never writes it, so an `Added {date}` headline had no data on most manuscripts.
   */
  it("leads with the status and its date", () => {
    const t = onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(t.headline).toBe("Querying since 20 June 2026");
    expect(t.headline).not.toContain("Added");
  });

  it("a non-querying status leads the same way, in its own words", () => {
    const t = onTheShelf({ status: ManuscriptStatus.REVISING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(t.headline).toBe("Revising since 20 June 2026");
  });

  it("the duration is stated factually — submission time only while submitting", () => {
    const querying = onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(querying.detail).toBe("That's seven weeks of active submission.");
    const revising = onTheShelf({ status: ManuscriptStatus.REVISING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(revising.detail).toBe("That's seven weeks so far.");
  });

  /** ⚠️ The app reports; it does not appraise. No verdict on whether seven weeks is good. */
  it("and carries no appraisal of how the querying is going", () => {
    const t = onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(t.detail).not.toMatch(/only|already|still|good|great|slow|patience|keep going|well done/i);
  });

  it("`Added` appears ONLY when createdDate genuinely exists, and then in the detail", () => {
    const without = onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW);
    expect(without.detail).not.toContain("Added");

    const with_ = onTheShelf(
      { status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z", createdDate: "2026-06-12T00:00:00.000Z" },
      NOW,
    );
    expect(with_.headline).toBe("Querying since 20 June 2026");
    expect(with_.detail).toBe("Added 12 June 2026. That's seven weeks of active submission.");
  });

  /** ⚠️ No status date → the status alone. Never a fabricated one from the earliest activity. */
  it("with no resolvable status date: the status alone, no date clause", () => {
    const t = onTheShelf({ status: ManuscriptStatus.DRAFTING, statusChangedDate: "" }, NOW);
    expect(t.headline).toBe("Drafting");
    expect(t.detail).toBeNull();
  });

  it("a status change today states no duration rather than 'zero weeks'", () => {
    const t = onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: new Date(NOW).toISOString() }, NOW);
    expect(t.detail).toBeNull();
  });

  it("elapsed reads days under a week, weeks after, and singulars agree", () => {
    const d = (n: number) => elapsedPhrase(NOW - n * 86_400_000, NOW);
    expect(d(1)).toBe("one day");
    expect(d(4)).toBe("four days");
    expect(d(7)).toBe("one week");
    expect(d(49)).toBe("seven weeks");
    expect(d(0)).toBeNull();
  });

  it("numbers are spelled to twelve and numeric after", () => {
    expect(spellCount(7)).toBe("seven");
    expect(spellCount(12)).toBe("twelve");
    expect(spellCount(13)).toBe("13");
  });

  it("a since-date carries its year — it may not be this one", () => {
    expect(sinceDate(Date.parse("2024-06-12T00:00:00.000Z"))).toBe("12 June 2024");
  });
});

/* ── tile 4 ─────────────────────────────────────────────────────────────────────────────────── */

describe("tile 4 — Submission materials", () => {
  it("counts packages, singular at one", () => {
    expect(submissionMaterials([], []).headline).toBe("No packages compiled yet");
    expect(submissionMaterials([pkg("a")], []).headline).toBe("1 package compiled");
    expect(submissionMaterials([pkg("a"), pkg("b")], []).headline).toBe("2 packages compiled");
  });

  /** ⚠️ Absent materials are OMITTED, not listed as "not added yet" (the ref does the latter). */
  it("lists the materials that exist, with counts, and omits the ones that do not", () => {
    const vs = [ver(ComponentType.QUERY_LETTER, "a"), ver(ComponentType.QUERY_LETTER, "b"), ver(ComponentType.SYNOPSIS, "c")];
    const t = submissionMaterials([pkg("p")], vs);
    expect(t.detail).toBe("Query letter (2) · Synopsis (1).");
    expect(t.detail).not.toContain("Sample pages");
    expect(t.detail).not.toContain("not added");
  });

  it("nothing at all: one plain sentence, and no pitch", () => {
    const t = submissionMaterials([], []);
    expect(t.detail).toBe("No materials added yet.");
    expect(t.detail).not.toMatch(/Pro|upgrade|tidy package|what's included/i);
  });
});

/* ── the rendered pane ──────────────────────────────────────────────────────────────────────── */

const tiles = (over: Partial<React.ComponentProps<typeof ManuscriptDetailTiles>> = {}) =>
  renderToStaticMarkup(
    React.createElement(ManuscriptDetailTiles, {
      world: outInTheWorld([q()]),
      comps: comparableTitlesTile([]),
      shelf: onTheShelf({ status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-06-20T00:00:00.000Z" }, NOW),
      materials: submissionMaterials([], []),
      ...over,
    }),
  );

describe("the pane", () => {
  it("renders four tiles with the ref's four labels", () => {
    const html = tiles();
    for (const label of ["Out in the world", "Comparable titles", "On the shelf", "Submission materials"]) {
      expect(html).toContain(label);
    }
    // ⚠️ Anchored on the exact class — `msv-btile` is a PREFIX of msv-btilebody/lab/head/det,
    // so a loose match counts 20 and would keep counting 20 with three tiles deleted.
    expect(html.match(/class="msv-btile"/g)).toHaveLength(4);
  });

  it("each tile carries its mark, and the plane's is the only pink plate", () => {
    const html = tiles();
    expect(html.match(/<svg/g)).toHaveLength(4);
    expect(html.match(/msv-scene pink/g)).toHaveLength(1);
  });

  it("all four links render", () => {
    const html = tiles();
    for (const link of ["View in Queries Hub", "Open the shelf", "Edit details", "Open package builder"]) {
      expect(html).toContain(link);
    }
  });

  /** ⚠️ Tile 4 has ONE variant. No chip, no upsell, no "see what's included". */
  it("tile 4 is unchipped and sells nothing", () => {
    const html = tiles({ materials: submissionMaterials([pkg("a")], [ver(ComponentType.SYNOPSIS, "s")]) });
    expect(html).not.toMatch(/prochip|Upgrade|One tidy package|See what's included/i);
  });

  it("a null detail renders NO paragraph, rather than an empty one", () => {
    const html = tiles({ comps: comparableTitlesTile([comp("A"), comp("B")]), shelf: { headline: "Drafting", detail: null } });
    expect(html).toContain("Drafting");
    expect(html.match(/msv-btiledet/g)).toHaveLength(3); // world, comps pitch, materials — not shelf
  });

  /** The shelf link switches TAB; it must not render as navigation. */
  it("links are buttons, not anchors — the shelf link is a tab switch", () => {
    expect(tiles()).not.toContain("<a ");
    expect(tiles()).not.toContain("href");
  });
});

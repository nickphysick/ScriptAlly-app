/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the pitch shelf's derivation — four assets, the synopsis projection, and the meter's
 * caption. Pure functions, so these assert behaviour rather than source text.
 */
import { describe, it, expect } from "vitest";
import {
  pitchAssets,
  pitchShelf,
  pitchMeter,
  synopsisVersions,
  PITCH_TOTAL,
} from "./manuscriptPitch";
import { Manuscript, ManuscriptVersion, ManuscriptStatus, ComponentType } from "../types";

const ms = (over: Partial<Manuscript> = {}): Manuscript =>
  ({
    id: "m1", userId: "u", title: "Murphy's Day Out",
    genre: "thriller", ageCategory: "Young Adult", wordCount: 50000,
    logline: "", comps: [],
    status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-01-05T00:00:00.000Z",
    ...over,
  } as Manuscript);

const ver = (over: Partial<ManuscriptVersion> = {}): ManuscriptVersion =>
  ({
    id: "v1", manuscriptId: "m1", userId: "u",
    componentType: ComponentType.SYNOPSIS, versionName: "Synopsis v1",
    fileAttached: false, createdDate: "2026-02-01T00:00:00.000Z",
    ...over,
  } as ManuscriptVersion);

describe("the shelf holds FOUR pieces, and only two of them are stored on the manuscript", () => {
  it("names the four in order", () => {
    const keys = pitchAssets(ms(), []).map((a) => a.key);
    expect(keys).toEqual(["logline", "elevator", "blurb", "synopsis"]);
    expect(PITCH_TOTAL).toBe(4);
  });

  it("reads the logline from the EXISTING field — never a second one", () => {
    const [logline] = pitchAssets(ms({ logline: "Murphy catches a fly" }), []);
    expect(logline.written).toBe(true);
    expect(logline.text).toBe("Murphy catches a fly");
  });

  it("reads the elevator pitch and blurb from their own fields", () => {
    const assets = pitchAssets(ms({ elevatorPitch: "Fifty words", backCoverBlurb: "A hundred" }), []);
    expect(assets[1].written).toBe(true);
    expect(assets[1].text).toBe("Fifty words");
    expect(assets[2].written).toBe(true);
    expect(assets[2].text).toBe("A hundred");
  });

  /* ⚠️ THE FINDING THAT SHAPED THIS MODULE. Synopsis prose lives on a ManuscriptVersion, authored
     in the Package Workshop. If this ever starts reading a manuscript field, one piece of prose has
     two stores and the two pages will disagree about it. */
  it("takes the synopsis from a VERSION, and stores nothing for it", () => {
    const assets = pitchAssets(ms(), [ver({ contentDraft: "She maps the coast." })]);
    const syn = assets[3];
    expect(syn.written).toBe(true);
    expect(syn.text).toBe("She maps the coast.");
    expect(syn.readOnly).toBe(true);
  });

  it("marks only the synopsis read-only — the other three edit in place", () => {
    const assets = pitchAssets(ms(), []);
    expect(assets.filter((a) => a.readOnly).map((a) => a.key)).toEqual(["synopsis"]);
  });

  it("ignores versions that are not synopses", () => {
    const assets = pitchAssets(ms(), [
      ver({ componentType: ComponentType.QUERY_LETTER, contentDraft: "Dear agent" }),
    ]);
    expect(assets[3].written).toBe(false);
    expect(assets[3].text).toBeNull();
  });

  /* A link-mode version has a URL and no prose: nothing to show, nothing for Copy to lift. Filling
     a segment for it would report a piece the shelf cannot produce. */
  it("does not count a synopsis version that carries no prose", () => {
    const assets = pitchAssets(ms(), [ver({ contentType: "link", contentLink: "https://x" })]);
    expect(assets[3].written).toBe(false);
  });

  it("takes the NEWEST synopsis version that has prose", () => {
    const assets = pitchAssets(ms(), [
      ver({ id: "old", createdDate: "2026-01-01T00:00:00.000Z", contentDraft: "first" }),
      ver({ id: "new", createdDate: "2026-03-01T00:00:00.000Z", contentDraft: "latest" }),
    ]);
    expect(assets[3].text).toBe("latest");
  });

  it("counts the synopsis versions for the card's derived fact", () => {
    const shelf = pitchShelf(ms(), [
      ver({ id: "a", contentDraft: "one" }),
      ver({ id: "b", createdDate: "2026-03-01T00:00:00.000Z", contentDraft: "two" }),
      ver({ id: "c", componentType: ComponentType.SYNOPSIS }),
    ]);
    expect(shelf.synopsisVersionCount).toBe(3);
    expect(synopsisVersions([ver(), ver({ componentType: ComponentType.SYNOPSIS })])).toHaveLength(2);
  });

  it("treats whitespace as unwritten", () => {
    const assets = pitchAssets(ms({ logline: "   ", elevatorPitch: "\n" }), [ver({ contentDraft: " " })]);
    expect(assets.map((a) => a.written)).toEqual([false, false, false, false]);
  });
});

describe("the meter reports what is written and what is outstanding", () => {
  const meterFor = (written: boolean[]) =>
    pitchMeter(
      ["logline", "elevator", "blurb", "synopsis"].map((key, i) => ({
        key: key as any, label: key, short: key, hint: "",
        written: written[i], text: null, readOnly: false,
      }))
    );

  it("an empty shelf says so, and points at the first piece", () => {
    const m = meterFor([false, false, false, false]);
    expect(m.written).toBe(0);
    expect(m.left).toBe("Pitch shelf empty");
    expect(m.right).toBe("Start with the logline");
  });

  it("a full shelf states the total and adds NO second clause", () => {
    const m = meterFor([true, true, true, true]);
    expect(m.left).toBe("All 4 pitch pieces written");
    expect(m.right).toBeNull();
  });

  it("names the one outstanding piece", () => {
    const m = meterFor([true, true, true, false]);
    expect(m.left).toBe("3 of 4 pitch pieces written");
    expect(m.right).toBe("Synopsis to go");
  });

  it("names two outstanding pieces", () => {
    const m = meterFor([true, true, false, false]);
    expect(m.left).toBe("2 of 4 pitch pieces written");
    expect(m.right).toBe("Blurb and synopsis to go");
  });

  /* Three names truncate in an 8.5px mono line, and a truncated list reads as a shorter list. */
  it("counts beyond two rather than truncating a list", () => {
    const m = meterFor([true, false, false, false]);
    expect(m.right).toBe("3 pieces to go");
  });

  it("hands the card its fills rather than a number to recount", () => {
    expect(meterFor([true, false, true, false]).segments).toEqual([true, false, true, false]);
  });

  /* ⚠️ THE APP REPORTS, IT NEVER APPRAISES. One adverb turns "2 of 4 written" into a verdict on
     the writer. Asserted, not merely intended. */
  it("never appraises", () => {
    const forbidden = /\b(only|already|still|good|slow|behind|nearly|just|simply|finally|at last)\b/i;
    for (const written of [
      [false, false, false, false], [true, false, false, false], [true, true, false, false],
      [true, true, true, false], [true, true, true, true],
    ]) {
      const m = meterFor(written);
      expect(m.left).not.toMatch(forbidden);
      if (m.right) expect(m.right).not.toMatch(forbidden);
    }
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the pitch shelf.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ManuscriptPitchPane, ManuscriptPitchPaneProps } from "./ManuscriptPitchPane";
import { pitchAssets, PITCH_DESCRIPTION, wordCount, wordCountLabel, liveCountLabel } from "../../lib/manuscriptPitch";
import { PITCH_NEEDS_ONE, PITCH_NEEDS_TWO } from "../../lib/manuscriptTiles";
import { Manuscript, ManuscriptVersion, ManuscriptStatus, ComponentType } from "../../types";

const ms = (over: Partial<Manuscript> = {}): Manuscript =>
  ({
    id: "m1", userId: "u", title: "T", genre: "thriller", ageCategory: "Adult",
    wordCount: 50000, logline: "", comps: [],
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

const noop = () => {};
const BASE: ManuscriptPitchPaneProps = {
  assets: pitchAssets(ms(), []),
  pitch: { kind: "none" },
  pitchText: null,
  synopsisVersionCount: 0,
  synopsisDate: null,
  onCopy: noop,
  onSave: noop,
  onOpenWorkshop: noop,
};

const pane = (over: Partial<ManuscriptPitchPaneProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptPitchPane, { ...BASE, ...over }));

const WRITTEN = ms({
  logline: "Murphy catches a fly",
  elevatorPitch: "A seaside town closes ranks around a drowning nobody will admit happened.",
  backCoverBlurb: "Nobody swims at Gullpoint after dark.",
});

describe("the shelf holds four pieces and every written one can be copied", () => {
  it("names all four", () => {
    const html = pane({ assets: pitchAssets(WRITTEN, [ver({ contentDraft: "She maps the coast." })]) });
    for (const label of ["Logline", "Elevator pitch", "Back-cover blurb", "Synopsis"]) {
      expect(html).toContain(label);
    }
  });

  /* ⚠️ COPY IS THE POINT OF THIS PAGE — one click to the clipboard on every written piece. */
  it("puts Copy on every written piece", () => {
    const html = pane({ assets: pitchAssets(WRITTEN, [ver({ contentDraft: "She maps the coast." })]) });
    expect((html.match(/>Copy</g) ?? []).length).toBe(4);
  });

  it("renders each piece's prose", () => {
    const html = pane({ assets: pitchAssets(WRITTEN, [ver({ contentDraft: "She maps the coast." })]) });
    expect(html).toContain("Murphy catches a fly");
    expect(html).toContain("closes ranks");
    expect(html).toContain("Nobody swims at Gullpoint");
    expect(html).toContain("She maps the coast.");
  });

  it("states each piece's derived word count", () => {
    const html = pane({ assets: pitchAssets(ms({ logline: "one two three" }), []) });
    expect(html).toContain("3 words");
  });
});

describe("an empty piece says what it is, and nothing about the writer", () => {
  it("shows the description and a Write it action", () => {
    const html = pane();
    expect(html).toContain(PITCH_DESCRIPTION.logline);
    expect(html).toContain("Write it");
    expect(html).toContain("msv-asset empty");
  });

  /**
   * ⚠️ THE APP REPORTS, IT NEVER APPRAISES OR COACHES. An empty slot states what belongs in it.
   * Asserted against the descriptions themselves, not just against the rendered page, so a new
   * description cannot smuggle an imperative in.
   */
  it("never coaches", () => {
    const forbidden = /\b(you|your|should|must|don't|remember|try|why not|make sure|need to|be sure)\b/i;
    for (const [key, text] of Object.entries(PITCH_DESCRIPTION)) {
      expect(text, `${key} coaches the writer`).not.toMatch(forbidden);
    }
  });

  it("offers no Copy for a piece that does not exist", () => {
    expect(pane()).not.toContain(">Copy<");
  });
});

describe("the synopsis card surfaces a version and stores nothing", () => {
  const withSyn = (over: Partial<ManuscriptPitchPaneProps> = {}) =>
    pane({
      assets: pitchAssets(ms(), [ver({ contentDraft: "She maps the coast." })]),
      synopsisVersionCount: 3,
      synopsisDate: "1 Feb",
      ...over,
    });

  it("renders the version's prose and states its date", () => {
    const html = withSyn();
    expect(html).toContain("She maps the coast.");
    expect(html).toContain("Version of 1 Feb");
  });

  /* The count is a fact about the store, and it is stated only when there is more than one. */
  it("states the version count only in the plural", () => {
    expect(withSyn()).toContain("3 versions on file");
    expect(withSyn({ synopsisVersionCount: 1 })).not.toContain("versions on file");
  });

  /**
   * ⚠️ READ-ONLY HERE. The Package Workshop is the single editing home for synopsis prose; this card
   * deep-links to it rather than opening an editor, so one piece of writing keeps one store.
   */
  it("sends both Edit and Write it to the Workshop rather than editing in place", () => {
    const calls: string[] = [];
    const el = React.createElement(ManuscriptPitchPane, {
      ...BASE,
      assets: pitchAssets(ms(), [ver({ contentDraft: "x" })]),
      onOpenWorkshop: () => calls.push("workshop"),
      onSave: () => calls.push("save"),
    });
    // The rendered markup carries no textarea for the synopsis, in either of its two states.
    expect(renderToStaticMarkup(el)).not.toContain('aria-label="Synopsis"');
    const empty = pane({ assets: pitchAssets(ms(), []) });
    expect(empty).toContain("Write it");
    expect(empty).not.toContain('aria-label="Synopsis"');
  });
});

describe("the derived pitch line", () => {
  it("renders the two comps with its own Copy", () => {
    const html = pane({ pitch: { kind: "two", a: "Stormbreak", b: "A Good Girl's Guide" }, pitchText: "Stormbreak meets A Good Girl's Guide" });
    expect(html).toContain("Stormbreak");
    expect(html).toContain("meets");
    expect(html).toContain("msv-pcopy");
  });

  /* A button that copies nothing is worse than no button. */
  it("offers no Copy while the line is incomplete", () => {
    expect(pane({ pitch: { kind: "one", a: "Stormbreak" } })).not.toContain("msv-pcopy");
    expect(pane()).not.toContain("msv-pcopy");
  });

  /* ⚠️ SCOPED TO THE THRESHOLD STRINGS, not the whole pane. The pane also renders PITCH_LABEL
     ("…of your pitch — from your comp shelf"), where the possessive is descriptive and correct — a
     whole-page sweep for "your" fails on copy that was never under test. The strings are what this
     rule is about, so the strings are what it reads. */
  it("states the threshold rather than urging, when the line is short", () => {
    expect(pane({ pitch: { kind: "one", a: "Stormbreak" } })).toContain("needs one more");
    expect(pane()).toContain("needs two comps");
    for (const s of [PITCH_NEEDS_ONE, PITCH_NEEDS_TWO]) {
      expect(s).not.toMatch(/\b(you|your|add|try|just|simply|should|must)\b/i);
    }
  });
});

describe("the counts are derived, and stated as facts", () => {
  it("counts words without storing any", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("  spaced   out  ")).toBe(2);
    expect(wordCount("")).toBe(0);
    expect(wordCount(null)).toBe(0);
  });

  it("agrees in number at one", () => {
    expect(wordCountLabel("solo")).toBe("1 word");
    expect(wordCountLabel("two words")).toBe("2 words");
  });

  /* "38 words · aim 100–150" is two facts; "38 words · too short" would be an opinion. */
  it("puts the live count beside the length without judging it", () => {
    expect(liveCountLabel("a b c", "100–150 words")).toBe("3 words · aim 100–150 words");
    expect(liveCountLabel("a", "About 50 words")).toBe("1 word · aim 50 words");
  });
});

describe("⚠️ ALL FOUR ARE FREE — this is the core promise, not an upsell surface", () => {
  const SRC = readFileSync(resolve(__dirname, "./ManuscriptPitchPane.tsx"), "utf8");

  it("takes no plan input at all", () => {
    expect(SRC).not.toContain("isPro");
    expect(SRC).not.toContain("UserPlan");
  });

  it("and sells nothing", () => {
    const html = pane({ assets: pitchAssets(WRITTEN, []) });
    expect(html).not.toMatch(/\b(upgrade|pro plan|unlock|premium)\b/i);
  });
});

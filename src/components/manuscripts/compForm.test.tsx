/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The comp form's rules (comps v26): labels that follow the type, the tag box and the ready note. The layout is measured on the rendered page (tests/e2e/compsV26.measure.ts).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { FIELD_COPY, MAX_TAGS, MEDIA, NEEDS_BOOK, NEEDS_SCREEN, TAG_SUGGESTIONS, joinTags, readyState, splitTags, withTag, yearError } from "./CompForm";
import { ready } from "../../lib/compUsage";

describe("the type and the labels that follow it", () => {
  it("four types, Book first, stored in `media`", () => {
    expect(MEDIA.map((m) => m.value)).toEqual(["book", "film", "tv", "other"]);
  });
  it("the second and third fields are named for the type", () => {
    expect([FIELD_COPY.book.who, FIELD_COPY.book.pub]).toEqual(["Author", "Publisher"]);
    expect([FIELD_COPY.film.who, FIELD_COPY.film.pub]).toEqual(["Director", "Studio or distributor"]);
    expect([FIELD_COPY.tv.who, FIELD_COPY.tv.pub]).toEqual(["Creator", "Network or channel"]);
    expect([FIELD_COPY.other.who, FIELD_COPY.other.pub]).toEqual(["Creator", "Publisher or platform"]);
  });
});

describe("the tag box", () => {
  it("adds trimmed, drops commas, refuses a duplicate (ignoring case) and a seventh", () => {
    expect(withTag([], "  Tone, ")).toEqual(["Tone"]);
    expect(withTag(["Tone"], "tone")).toEqual(["Tone"]);
    expect(withTag(["Tone"], "   ")).toEqual(["Tone"]);
    const six = ["a", "b", "c", "d", "e", "f"];
    expect(six.length).toBe(MAX_TAGS);
    expect(withTag(six, "g")).toEqual(six);
  });
  it("is stored as today: joined with a spaced middle dot, and read back by splitting on it", () => {
    expect(joinTags(["Tone", "Coastal"])).toBe("Tone · Coastal");
    expect(splitTags("Tone · Coastal")).toEqual(["Tone", "Coastal"]);
    expect(splitTags(joinTags(["Single day", "Close third"]))).toEqual(["Single day", "Close third"]);
    expect(splitTags(undefined)).toEqual([]);
  });
  it("seven suggestions", () => {
    expect(TAG_SUGGESTIONS).toEqual(["Tone", "Setting", "Premise", "Voice", "Readers", "Structure", "Time period"]);
  });
});

describe("the ready note", () => {
  const cases = [
    { d: { title: "", media: "book" as const }, want: "idle" },
    { d: { title: "A", media: "book" as const, year: 2024 }, want: "needs" },
    { d: { title: "A", media: "book" as const, year: 2024, publisher: "Faber" }, want: "ready" },
    { d: { title: "A", media: "film" as const, year: 2023 }, want: "ready" },
    { d: { title: "A", media: "tv" as const }, want: "needs" },
    /* ready() decides, title or no title */
    { d: { title: "", media: "film" as const, year: 2023 }, want: "ready" },
  ];
  it("is ready exactly when ready() says so, and quiet before a title is typed", () => {
    for (const c of cases) {
      expect(readyState(c.d), JSON.stringify(c.d)).toBe(c.want);
      expect(readyState(c.d) === "ready").toBe(ready(c.d));
    }
    /* every state was entered */
    expect(new Set(cases.map((c) => c.want))).toEqual(new Set(["idle", "needs", "ready"]));
  });
  it("says what a letter needs, by type, and that it can still be saved", () => {
    expect(NEEDS_BOOK).toContain("a publisher and year");
    expect(NEEDS_SCREEN).toContain("a year");
    expect(NEEDS_SCREEN).not.toContain("publisher");
    for (const s of [NEEDS_BOOK, NEEDS_SCREEN]) expect(s).toContain("You can still save it without.");
  });
  it("never blocks a save: the foot's Save reads the title and nothing else", () => {
    const src = readFileSync("src/components/manuscripts/CompForm.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const save = /data-cf="save" disabled=\{([^}]*)\}/.exec(src);
    expect(save, "the Save button").not.toBeNull();
    expect(save![1].trim()).toBe("!form.hasTitle");
  });
  it("a year is checked for shape, never for age", () => {
    expect([yearError(""), yearError("1985"), yearError("2021")]).toEqual([null, null, null]);
    expect(yearError("21")).toBe("Use four digits, like 2021.");
  });
});

describe("no preview (comps v28)", () => {
  it("the form draws no list-row preview: the list it previewed is retired, and the v28 mock's form has none", () => {
    const form = readFileSync("src/components/manuscripts/CompForm.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(form).not.toMatch(/data-section="preview"|CompCell|NextCell|draftRow/);
  });
});

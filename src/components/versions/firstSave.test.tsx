/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2.2 C4 — the first save with NO earlier queries (design-refs/versions-v2-2, S37). The form must say that
 * Original is saved too and why, its diagram's Original reads "Your original manuscript", and the toast names Original;
 * nothing anywhere says "your 0 queries". With queries out, the v2 wording stands.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Manuscript } from "../../types";
import { firstSaveMessage, versionsModel } from "../../lib/versionsV2";
import { VersionForm } from "./V2Overlays";

const ms = { id: "m1", userId: "u1", title: "Dead Reckoning", genre: "Thriller", ageCategory: "Adult", wordCount: 70000, logline: "", status: "Querying", statusChangedDate: "2026-09-01" } as unknown as Manuscript;
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
const form = (earlier: number) => text(renderToStaticMarkup(
  <VersionForm ms={ms} m={versionsModel(ms, [], [], [], new Map())} edit={null} earlier={earlier} onClose={() => {}} onSave={() => {}} onDetails={() => {}} />,
));

describe("C4 — the first save with no earlier queries", () => {
  it("the form says Original is saved too, and its diagram's Original has no query count", () => {
    const t = form(0);
    expect(t).toContain("We’ll save your original manuscript as Original too, so this version has somewhere to start from.");
    expect(t).toContain("Your original manuscript");
    expect(t).not.toMatch(/0 quer/);
    expect(t).not.toContain("You already have");
  });
  it("with queries out the form keeps the earlier-queries note and the count", () => {
    const t = form(4);
    expect(t).toContain("You already have 4 queries out.");
    expect(t).toContain("Your original manuscript · 4 queries");
    expect(t).not.toContain("so this version has somewhere to start from");
  });
  it("the toast: Original with it, or the earlier queries counting towards it", () => {
    expect(firstSaveMessage("Ferry at dawn", 0)).toBe("Saved Ferry at dawn, and Original with it.");
    expect(firstSaveMessage("Shorter opening", 4)).toBe("Saved Shorter opening. Your 4 earlier queries count towards Original.");
    expect(firstSaveMessage("Shorter opening", 1)).toBe("Saved Shorter opening. Your 1 earlier query counts towards Original.");
  });
});

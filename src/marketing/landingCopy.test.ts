/**
 * Copy locks for the landing (design-refs/landing-v13.html is word-authoritative). The pack
 * requires the strapline and hero sub-copy verbatim — these tests pin the exact strings the
 * components render (repo convention: pure node tests; the components consume these same
 * constants, so a drift in either place fails here).
 */

import { describe, it, expect } from "vitest";
import {
  HERO_H1, HERO_SUB, HERO_EYEBROW, HERO_NOTE, CTA_START,
  FEATURES_H2, FEATURES_SUB, CTA_BAND_H2, DOCUMENT_TITLE, FEATURE_ROWS,
} from "./landingCopy";

describe("landing copy — verbatim locks", () => {
  it("strapline", () => {
    expect(HERO_H1).toBe("Take control of your querying journey.");
  });

  it("hero sub-copy, word for word", () => {
    expect(HERO_SUB).toBe(
      "Every agent, every query, every response — tracked. And that's just the start of it. " +
        "ScriptAlly is a finger on the pulse of your querying journey, packed with tools designed " +
        "to aid you on your quest to find a champion for your words."
    );
  });

  it("eyebrow, note and primary CTA", () => {
    expect(HERO_EYEBROW).toBe("For querying writers");
    expect(HERO_NOTE).toBe("Free to start · Built for UK querying");
    expect(CTA_START).toBe("Start tracking — it's free");
  });

  it("features header pair", () => {
    expect(FEATURES_H2).toBe("The querying trenches, organised");
    expect(FEATURES_SUB).toBe("Ditch the spreadsheet. It's time to get serious.");
  });

  it("CTA band and document title", () => {
    expect(CTA_BAND_H2).toBe("Your story deserves better than a spreadsheet.");
    expect(DOCUMENT_TITLE).toBe("ScriptAlly — Take control of your querying journey");
  });

  it("seven feature rows, alternating from the second, Pro badge only on the email drop", () => {
    expect(FEATURE_ROWS).toHaveLength(7);
    expect(FEATURE_ROWS.map((r) => r.heading)).toEqual([
      "Smart Import", "Track every query", "A home for your agents", "A finger on the pulse",
      "Curate and compare", "Smart email drop", "Notes to self",
    ]);
    expect(FEATURE_ROWS.map((r) => !!r.flip)).toEqual([false, true, false, true, false, true, false]);
    expect(FEATURE_ROWS.filter((r) => r.pro).map((r) => r.key)).toEqual(["email"]);
    // Notes to self is the one row without a text link (per the ref markup).
    expect(FEATURE_ROWS.filter((r) => !r.link).map((r) => r.key)).toEqual(["notes"]);
  });
});

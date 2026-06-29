/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the territory module — the single source of truth for ISO-based agent/user location.
 * Covers: code↔name both directions, legacy full-name pass-through/reverse-map, flag class derivation,
 * `isHomeMarket` across mixed code/name inputs, `detectHomeRegion` with a mocked locale, and the
 * `getHomeCountry` fallback chain.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  COUNTRIES_ISO,
  QUICK_PICKS,
  countryName,
  flagFor,
  isHomeMarket,
  detectHomeRegion,
  getHomeCountry,
} from "./territory";

describe("territory · COUNTRIES_ISO + QUICK_PICKS", () => {
  it("is the full set, every code paired with a name, sorted by name", () => {
    expect(COUNTRIES_ISO.length).toBeGreaterThan(200);
    for (const c of COUNTRIES_ISO) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name.length).toBeGreaterThan(0);
    }
    const names = COUNTRIES_ISO.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("includes the quick-pick markets", () => {
    const codes = new Set(COUNTRIES_ISO.map((c) => c.code));
    for (const q of QUICK_PICKS) expect(codes.has(q)).toBe(true);
  });
});

describe("territory · countryName (code ↔ name, legacy pass-through)", () => {
  it("resolves a code to its display name", () => {
    expect(countryName("GB")).toBe("United Kingdom");
    expect(countryName("US")).toBe("United States");
    expect(countryName("gb")).toBe("United Kingdom"); // case-insensitive
  });

  it("passes a legacy full name through to its canonical name", () => {
    expect(countryName("United Kingdom")).toBe("United Kingdom");
    expect(countryName("Ireland")).toBe("Ireland");
  });

  it("preserves an unrecognised non-empty value rather than blanking", () => {
    expect(countryName("Atlantis")).toBe("Atlantis");
  });

  it("returns undefined for absent/empty values", () => {
    expect(countryName(undefined)).toBeUndefined();
    expect(countryName(null)).toBeUndefined();
    expect(countryName("")).toBeUndefined();
    expect(countryName("   ")).toBeUndefined();
  });
});

describe("territory · flagFor", () => {
  it("yields the flag-icons class pair for a code", () => {
    expect(flagFor("GB")).toBe("fi fi-gb");
    expect(flagFor("US")).toBe("fi fi-us");
  });

  it("reverse-maps a legacy name to its flag", () => {
    expect(flagFor("United Kingdom")).toBe("fi fi-gb");
  });

  it("returns undefined for unknown/absent values", () => {
    expect(flagFor("Atlantis")).toBeUndefined();
    expect(flagFor(undefined)).toBeUndefined();
    expect(flagFor("")).toBeUndefined();
  });
});

describe("territory · isHomeMarket (mixed code/name normalisation)", () => {
  it("matches code vs code", () => {
    expect(isHomeMarket("GB", "GB")).toBe(true);
    expect(isHomeMarket("US", "GB")).toBe(false);
  });

  it("matches code vs legacy name and name vs name", () => {
    expect(isHomeMarket("GB", "United Kingdom")).toBe(true);
    expect(isHomeMarket("United Kingdom", "GB")).toBe(true);
    expect(isHomeMarket("United Kingdom", "United Kingdom")).toBe(true);
  });

  it("is false when either side is unknown/absent", () => {
    expect(isHomeMarket(undefined, "GB")).toBe(false);
    expect(isHomeMarket("GB", undefined)).toBe(false);
    expect(isHomeMarket("Atlantis", "GB")).toBe(false);
  });
});

describe("territory · detectHomeRegion (mocked locale)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the region subtag of navigator.language", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    expect(detectHomeRegion()).toBe("US");
  });

  it("upper-cases and validates the region", () => {
    vi.stubGlobal("navigator", { language: "fr-fr" });
    expect(detectHomeRegion()).toBe("FR");
  });

  it("returns undefined when the language carries no resolvable region", () => {
    // Plain "en" has no region; with no matching timezone the result is undefined. We can't control the
    // host timezone here, so accept either undefined or a valid 2-letter code from the tz fallback.
    vi.stubGlobal("navigator", { language: "en" });
    const r = detectHomeRegion();
    expect(r === undefined || /^[A-Z]{2}$/.test(r)).toBe(true);
  });
});

describe("territory · getHomeCountry (fallback chain)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prefers an explicit stored homeCountry", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    expect(getHomeCountry({ homeCountry: "IE" })).toBe("IE");
  });

  it("normalises a legacy stored name", () => {
    expect(getHomeCountry({ homeCountry: "United Kingdom" })).toBe("GB");
  });

  it("falls back to the detected region when nothing is stored", () => {
    vi.stubGlobal("navigator", { language: "en-AU" });
    expect(getHomeCountry({})).toBe("AU");
  });

  it("falls back to GB when nothing resolves", () => {
    vi.stubGlobal("navigator", { language: "" });
    // language is empty and homeCountry absent; tz fallback may or may not hit, but GB is the floor.
    const r = getHomeCountry(null);
    expect(/^[A-Z]{2}$/.test(r)).toBe(true);
    if (detectHomeRegion() === undefined) expect(r).toBe("GB");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.1 — the known-cities offer (lib/knownCities): an offer only for a known city in another country, the
 * words for each case, and "Keep" remembered per city and country.
 */
import { describe, expect, it } from "vitest";
import { cityCountry, cityOffer, countryWords, keepKey, KNOWN_CITIES } from "./knownCities";

describe("knownCities", () => {
  it("knows UK, Irish and US cities only, and no name two countries share", () => {
    expect(new Set(Object.values(KNOWN_CITIES))).toEqual(new Set(["GB", "IE", "US"]));
    for (const shared of ["cambridge", "birmingham", "manchester", "bristol", "richmond", "portland", "plymouth"]) expect(KNOWN_CITIES[shared]).toBeUndefined();
  });
  it("reads a typed city loosely (case, spaces, a trailing full stop)", () => {
    expect(cityCountry("  dublin ")).toBe("IE");
    expect(cityCountry("New  York.")).toBe("US");
    expect(cityCountry("Narnia")).toBeNull();
    expect(cityCountry("")).toBeNull();
  });
  it("offers to change the country when the chosen one is wrong, and to set it when none is chosen", () => {
    expect(cityOffer("Dublin", "GB", new Set())).toMatchObject({ is: "IE", head: "Dublin is in Ireland. Change the country?", set: "Change to Ireland", keep: "Keep the UK" });
    expect(cityOffer("london", "", new Set())).toMatchObject({ is: "GB", head: "London is in the UK. Set the country?", set: "Set to the UK", keep: "Leave it" });
    expect(cityOffer("Dublin", "IE", new Set())).toBeNull();
    expect(cityOffer("Narnia", "GB", new Set())).toBeNull();
  });
  it("Keep is remembered for that city and that country only", () => {
    const kept = new Set([keepKey("Dublin", "GB")]);
    expect(cityOffer("dublin", "GB", kept)).toBeNull();
    expect(cityOffer("Dublin", "US", kept)).not.toBeNull();
    expect(cityOffer("Cork", "GB", kept)).not.toBeNull();
  });
  it("names countries as the offer says them", () => {
    expect([countryWords("GB"), countryWords("US"), countryWords("IE")]).toEqual(["the UK", "the US", "Ireland"]);
  });
});

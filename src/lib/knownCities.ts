/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.1 (design-refs/agent-card-v2-1/, screens 05–06) — THE CITIES THE APP KNOWS, for the "Based in" offer:
 * a city typed on the card that is known to be in a different country from the one chosen gets an offer to change the
 * country. It never blocks a save, and a city that is not in this table is accepted as typed. Nothing is looked up online.
 *
 * UK, Irish and US cities to begin with. ⚠️ A NAME TWO COUNTRIES SHARE IS LEFT OUT (Cambridge, Birmingham, Manchester,
 * Bristol, Richmond, Portland, Plymouth…): the offer must never tell the writer a true answer is wrong.
 *
 * ⚠️ THE FLAG NEVER COMES FROM HERE. It comes from the stored country alone; this table only ever suggests.
 */
import { countryName } from "./territory";

export const KNOWN_CITIES: Readonly<Record<string, "GB" | "IE" | "US">> = {
  /* the UK */
  london: "GB", edinburgh: "GB", glasgow: "GB", leeds: "GB", oxford: "GB", cardiff: "GB", belfast: "GB", brighton: "GB",
  bath: "GB", liverpool: "GB", york: "GB", "newcastle upon tyne": "GB", norwich: "GB", nottingham: "GB", sheffield: "GB",
  aberdeen: "GB", dundee: "GB", swansea: "GB", exeter: "GB", canterbury: "GB", leicester: "GB", coventry: "GB",
  southampton: "GB", inverness: "GB", derry: "GB",
  /* Ireland */
  dublin: "IE", cork: "IE", galway: "IE", limerick: "IE", waterford: "IE", kilkenny: "IE", sligo: "IE",
  /* the US */
  "new york": "US", "new york city": "US", brooklyn: "US", manhattan: "US", boston: "US", "los angeles": "US", chicago: "US",
  "san francisco": "US", seattle: "US", "washington dc": "US", "washington, dc": "US", philadelphia: "US", austin: "US",
  denver: "US", atlanta: "US", nashville: "US", minneapolis: "US", "new orleans": "US", miami: "US", "san diego": "US",
};

const key = (city: string) => city.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");

/** the country a typed city is known to be in, or null when the app does not know the city */
export function cityCountry(city: string | null | undefined): "GB" | "IE" | "US" | null {
  const k = key(city ?? "");
  return k ? KNOWN_CITIES[k] ?? null : null;
}

/** a country as the offer says it: "the UK", "the US", else the country's name */
export function countryWords(iso: string): string {
  if (iso === "GB") return "the UK";
  if (iso === "US") return "the US";
  return countryName(iso) ?? iso;
}
/** a typed city with each word capitalised, as the offer names it */
export const cityWords = (city: string) => city.trim().replace(/\s+/g, " ").replace(/(^|[\s-])(\p{L})/gu, (_m, s: string, c: string) => s + c.toUpperCase());

export interface CityOffer { city: string; is: "GB" | "IE" | "US"; chosen: string; head: string; set: string; keep: string }
/**
 * The offer for a city and the country chosen, or null when there is none: the city is unknown, or already in the chosen
 * country, or the writer has said "Keep" for this city and country (`kept`, `city|country` keys).
 */
export function cityOffer(city: string, chosen: string, kept: ReadonlySet<string>): CityOffer | null {
  const is = cityCountry(city);
  if (!is || is === chosen || kept.has(keepKey(city, chosen))) return null;
  const c = cityWords(city);
  return chosen
    ? { city: c, is, chosen, head: `${c} is in ${countryWords(is)}. Change the country?`, set: `Change to ${countryWords(is)}`, keep: `Keep ${countryWords(chosen)}` }
    : { city: c, is, chosen, head: `${c} is in ${countryWords(is)}. Set the country?`, set: `Set to ${countryWords(is)}`, keep: "Leave it" };
}
export const keepKey = (city: string, chosen: string) => `${key(city)}|${chosen}`;

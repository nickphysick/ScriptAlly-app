/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Territory — the single source of truth for agent/user location logic.
 *
 * Canonical storage is ISO 3166-1 alpha-2 (`"GB"`, `"US"`). Everything visual — the flag, the
 * display name, the home-vs-foreign distinction — is DERIVED at read time from those codes; nothing
 * territory-derived is ever stored on the agent and nothing is copied onto queries.
 *
 * Two representations coexist during the migration: the canonical ISO code, and the LEGACY full
 * country *name* still produced by the name-based `COUNTRIES` list in `agentOptions.ts` (and the
 * undeployed v12 Edit Agent drawer). Every public function therefore normalises its input through
 * `toCode()` first, so a stored `"United Kingdom"` and a stored `"GB"` behave identically. Consumers
 * migrate to writing codes in Prompt 2; this module makes the transition lossless.
 *
 * Values are NEVER `null`/`""` in storage — "not set" always means the key is omitted (the Firestore
 * `isValidAgent`/`isValidUser` rules reject a literal null via `data.x is string`). These helpers
 * treat `undefined`/`null`/`""` uniformly as "unknown" and degrade gracefully.
 */

/** One selectable country: canonical ISO alpha-2 code + English display name. */
export interface IsoCountry {
  code: string; // ISO 3166-1 alpha-2, upper-case
  name: string; // English display name
}

/**
 * The canonical ISO 3166-1 alpha-2 code set (full list). Display names are resolved from these via
 * `Intl.DisplayNames`, so there is no hand-maintained name table to drift. Kept as bare codes to stay
 * compact; `COUNTRIES_ISO` below pairs each with its resolved name.
 */
const ISO_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

const CODE_SET = new Set(ISO_CODES);

// Resolve display names once. `fallback: "none"` makes unknown codes resolve to undefined rather than
// echoing the code back, so a bad code never masquerades as a name.
const displayNames: { of(code: string): string | undefined } = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dn = new (Intl as any).DisplayNames(["en"], { type: "region", fallback: "none" });
    return { of: (code: string) => dn.of(code) as string | undefined };
  } catch {
    // Very old runtime with no Intl.DisplayNames — degrade to "code is its own name".
    return { of: (code: string) => code };
  }
})();

/** Display name for a known code, or the code itself if the runtime can't resolve it. */
function nameForCode(code: string): string {
  return displayNames.of(code) ?? code;
}

/** The canonical {code, name} list, sorted by display name — the full set for pickers. */
export const COUNTRIES_ISO: readonly IsoCountry[] = ISO_CODES
  .map((code) => ({ code, name: nameForCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Codes surfaced first in pickers (the app's core markets), in priority order. */
export const QUICK_PICKS: readonly string[] = ["GB", "US", "IE", "CA", "AU", "NZ"];

// Reverse map: lower-cased display name → canonical code. Built from the resolved names, plus explicit
// aliases for the LEGACY name-based `COUNTRIES` list (agentOptions.ts) and a few common variants, so a
// pre-migration stored full name resolves back to its code.
const NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const { code, name } of COUNTRIES_ISO) {
    m.set(name.toLowerCase(), code);
  }
  const aliases: Record<string, string> = {
    "united kingdom": "GB",
    "great britain": "GB",
    "uk": "GB",
    "united states": "US",
    "united states of america": "US",
    "usa": "US",
    "ireland": "IE",
    "canada": "CA",
    "australia": "AU",
    "new zealand": "NZ",
    "france": "FR",
    "germany": "DE",
    "india": "IN",
    "italy": "IT",
    "netherlands": "NL",
    "spain": "ES",
    "sweden": "SE",
  };
  for (const [name, code] of Object.entries(aliases)) m.set(name, code);
  return m;
})();

/**
 * Normalise any territory value to a canonical ISO code, or `undefined` if unknown.
 * Accepts a code ("gb"/"GB") OR a legacy full name ("United Kingdom"). Treats null/""/undefined and
 * unrecognised strings as "unknown". Internal — public helpers funnel through this.
 */
function toCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && CODE_SET.has(upper)) return upper;
  return NAME_TO_CODE.get(trimmed.toLowerCase());
}

/**
 * Display name for a territory value. A code resolves to its English name; a legacy full name passes
 * through (it's already a display name). Returns `undefined` for unknown/absent values.
 */
export function countryName(value: string | null | undefined): string | undefined {
  const code = toCode(value);
  if (code) return nameForCode(code);
  // Unresolvable but non-empty — preserve whatever was stored so a display never blanks out.
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Flag handle for a territory value: the `flag-icons` CSS class pair (e.g. `"fi fi-gb"`) for a known
 * country, or `undefined` for unknown/absent. Pure — the consuming component imports the flag-icons
 * stylesheet (Prompt 2); this just yields the class string, addressable by ISO code.
 */
export function flagFor(value: string | null | undefined): string | undefined {
  const code = toCode(value);
  return code ? `fi fi-${code.toLowerCase()}` : undefined;
}

/**
 * True iff an agent's country and the user's home country resolve to the SAME ISO code. Legacy names
 * on either side are normalised first, so "GB" vs "United Kingdom" counts as home. Unknown on either
 * side → false (we never claim a market match we can't prove).
 */
export function isHomeMarket(
  agentCountry: string | null | undefined,
  userHomeCountry: string | null | undefined,
): boolean {
  const a = toCode(agentCountry);
  const b = toCode(userHomeCountry);
  return !!a && !!b && a === b;
}

// A small timezone → ISO code fallback for when the browser locale carries no region (e.g. plain
// "en"). Deliberately minimal — covers the app's core markets; anything else returns undefined and the
// caller's default takes over.
const TZ_TO_CODE: Record<string, string> = {
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Stockholm": "SE",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Pacific/Auckland": "NZ",
  "Asia/Kolkata": "IN",
};

/**
 * Best-effort guess of the user's home country from the browser, returning an ISO code or `undefined`.
 * Primary: the region subtag of `navigator.language` (e.g. "en-GB" → "GB"). Fallback: map the IANA
 * timezone. Never uses IP. Used only to seed a default — the user can change it in settings.
 */
export function detectHomeRegion(): string | undefined {
  try {
    const lang = typeof navigator !== "undefined" ? navigator.language : undefined;
    if (lang) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const region: string | undefined = new (Intl as any).Locale(lang).region;
      if (region) {
        const code = region.toUpperCase();
        if (CODE_SET.has(code)) return code;
      }
    }
  } catch {
    /* fall through to timezone */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_CODE[tz]) return TZ_TO_CODE[tz];
  } catch {
    /* give up */
  }
  return undefined;
}

/**
 * The read-time home-country resolver everything downstream uses: an explicit stored value wins, else
 * a silent browser guess, else the app default `"GB"`. Always returns a usable ISO code.
 */
export function getHomeCountry(user: { homeCountry?: string } | null | undefined): string {
  return toCode(user?.homeCountry) ?? detectHomeRegion() ?? "GB";
}

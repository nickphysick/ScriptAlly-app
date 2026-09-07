/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUICK ADD — the pure half: what a slot writes, what it warns about, and where it goes next.
 *
 * ⚠️ VALIDATION WARNS, IT NEVER BLOCKS. A writer typing an agent's details from a submissions
 * page is copying something that already exists; the app's opinion about its shape is worth less
 * than the writer's knowledge of it. A malformed address is SAVED and said to be malformed. The
 * one thing that is not negotiable is that a saved value cannot become a live `javascript:` href
 * — and that is handled by normalising rather than by refusing, so "never blocks" survives intact.
 *
 * ⚠️ THE SCHEME ALLOWLIST IS AN ALLOWLIST BY CONSTRUCTION, NOT A DENYLIST. It does not hunt for
 * `javascript:` and `data:` — a denylist loses to `JaVaScRiPt:`, to a tab inside the word, to a
 * leading NUL, and to whatever the next parser quirk turns out to be. The rule is total: a stored
 * value either ALREADY begins `http://` or `https://`, or it is prefixed with `https://`. Anything
 * else — any other scheme, any mangling of one — comes out as the PATH of an https URL, which is
 * inert. There is no input that reaches a render site as a dangerous scheme.
 *
 * ⚠️ AND IT LIVES HERE BECAUSE THE IMPORTER WILL NEED IT. This is the same stored-XSS path parked
 * for Smart Import: a URL arriving from a CSV or an email is the identical problem, and it should
 * meet the identical function rather than a second one written from memory.
 */

/** The fields a quick-add popover can write. The wishlist and materials escalate to the drawer. */
export type QuickField = "email" | "website" | "location" | "genres";

/** The order Tab walks, which is the order the columns are read in. */
export const QUICK_ORDER: readonly QuickField[] = ["email", "website", "location", "genres"];

/**
 * ⚠️ TOTAL, AND SAFE FOR EVERY INPUT. Returns the value to store. Never throws, never returns a
 * value whose scheme is anything but http or https.
 */
export function normaliseSubmissionsUrl(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  /* already an http(s) URL — the only two schemes that survive as themselves */
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  /* a protocol-relative or path-leading value loses its slashes before it is prefixed, so
     "//agency.co.uk" becomes the host rather than an empty one (the ref does the same) */
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Is a stored value safe to put in an `href`? The render sites ask this rather than re-deriving
 * the test, so a value that got into the store by some other route — an import, a legacy record —
 * is checked at the point it would become live rather than trusted because it was stored.
 */
export const isLiveHref = (stored: string): boolean => /^https?:\/\//i.test((stored ?? "").trim());

/** The href for a stored submissions page, or null when it must not be one. */
export const hrefFor = (stored: string): string | null => {
  const v = normaliseSubmissionsUrl(stored);
  return v && isLiveHref(v) ? v : null;
};

/**
 * The warning under a field, or null. It is advice — the value saves either way.
 *
 * ⚠️ THE ADDRESS WARNING FIRES ON A SCHEME WE WILL REWRITE, and says so, because the alternative
 * is a writer pasting `javascript:…` (or, far more likely, `mailto:…` into the wrong field) and
 * finding it silently changed. A rewrite the reader was not told about is worse than a refusal.
 */
export function quickWarning(field: QuickField, value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (field === "email") {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
      ? null
      : "That doesn't look like an email address. You can save it anyway.";
  }
  if (field === "website") {
    if (/\s/.test(v)) return "Addresses don't contain spaces. You can save it anyway.";
    /* any scheme that is not http(s) — it will be stored as part of an https address */
    if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) {
      return "Only web addresses are stored. This will be saved as an https address.";
    }
    if (!/^https?:\/\//i.test(v)) return "Saved as https:// if you leave the prefix off.";
  }
  return null;
}

export interface LocationDraft { city: string; country: string }

/**
 * The diff a popover hands to `updateAgent`, or null when there is nothing to write.
 *
 * ⚠️ NOTHING IS AN EMPTY WRITE. Pressing Save on an untouched popover must not append an activity
 * or stamp the record; `updateAgent` writes one activity per call, so a no-op that still calls it
 * is a line in the writer's history saying something happened when nothing did.
 */
export function quickDiff(
  field: QuickField,
  draft: { value?: string; location?: LocationDraft; genres?: string[] },
): Record<string, unknown> | null {
  if (field === "email") {
    const v = (draft.value ?? "").trim();
    return v ? { email: v } : null;
  }
  if (field === "website") {
    const v = normaliseSubmissionsUrl(draft.value ?? "");
    return v ? { website: v } : null;
  }
  if (field === "location") {
    const city = (draft.location?.city ?? "").trim();
    const country = (draft.location?.country ?? "").trim();
    /* ⚠️ A CITY WITHOUT A COUNTRY CANNOT PRODUCE A FLAG, which is why the two are one popover and
       one write. Either alone is still stored — a half-known location is a fact — but they are
       asked for together so the common case comes out whole. */
    return city || country ? { city, country } : null;
  }
  const genres = (draft.genres ?? []).map((g) => g.trim()).filter(Boolean);
  return genres.length ? { genres } : null;
}

/** Which fields this agent still has nothing in, in the order Tab walks them. */
export function emptyQuickFields(agent: {
  email: string; website: string; city?: string; country?: string; genres: string[];
}): QuickField[] {
  const empty: QuickField[] = [];
  if (!(agent.email ?? "").trim()) empty.push("email");
  if (!(agent.website ?? "").trim()) empty.push("website");
  if (!(agent.city ?? "").trim() && !(agent.country ?? "").trim()) empty.push("location");
  if (!agent.genres.length) empty.push("genres");
  return empty;
}

/**
 * Where Tab goes after a save — the next empty field in THIS agent's row, or null at the end.
 *
 * ⚠️ IT NEVER CARRIES INTO THE NEXT AGENT. A keystroke that silently moves you to a different
 * record is a data-entry hazard: you would be three fields into somebody else's details before
 * anything on screen told you the row had changed.
 */
export function nextQuickField(
  agent: Parameters<typeof emptyQuickFields>[0],
  after: QuickField,
): QuickField | null {
  const empty = emptyQuickFields(agent).filter((f) => f !== after);
  const from = QUICK_ORDER.indexOf(after);
  return empty.find((f) => QUICK_ORDER.indexOf(f) > from) ?? empty[0] ?? null;
}

/**
 * The genre a reader has TYPED but not yet picked — committed as a chip, or null when there is
 * nothing to commit.
 *
 * ⚠️ ENTER MUST NOT DISCARD WHAT IS IN THE FIELD. Measured before this existed: typing
 * "Historical fiction" into the genres popover narrowed the suggestion list to that one entry, and
 * Enter then saved the PICKED chips — of which there were none — so the popover closed, nothing
 * was written, and the reader had every reason to believe they had added a genre. That is the
 * inert-control family: worse than a control that does nothing, because it looks like it worked.
 *
 * ⚠️ AND IT CANONICALISES AGAINST THE SUGGESTIONS, case-insensitively. The suggestions are the
 * writer's OWN genres from elsewhere in their list, so typing "historical fiction" beside an
 * existing "Historical fiction" would otherwise give them two genres that are the same genre —
 * and then two filter rows, two board captions and two tiles, none of which can be reconciled
 * afterwards. A genre that matches nothing is added exactly as typed: the list is a convenience,
 * never a closed vocabulary.
 */
export function commitTypedGenre(
  value: string,
  genres: readonly string[],
  suggestions: readonly string[],
): string[] | null {
  const typed = (value ?? "").trim();
  if (!typed) return null;
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const canonical = suggestions.find((g) => same(g, typed)) ?? typed;
  if (genres.some((g) => same(g, canonical))) return null;
  return [...genres, canonical];
}


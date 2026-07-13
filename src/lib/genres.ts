/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * genres — the ONE genre taxonomy, shared by manuscripts and agents (interaction layer, Stage 3).
 *
 * Standing decisions this module encodes:
 *  1. Store IDs, never labels. A genre value is a canonical id ("gothic-horror") or a personal id
 *     ("u:{uid}:northern-gothic") — never a display string. Labels can then be renamed, merged and
 *     corrected without touching a single stored record.
 *  2. One taxonomy. A manuscript's primary genre and an agent's genres draw from the SAME list —
 *     this module unions the two legacy lists (PREDEFINED_GENRES + AGENT_GENRES) with generous
 *     aliases so every historical spelling resolves.
 *  3. Three tiers. Canonical (here) → Personal (user-scoped, created only when nothing matches) →
 *     Promotion (the genreSuggestions queue, 3c). This module owns the first two + the resolution
 *     pipeline that decides which tier an entry lands in.
 *
 * PURE: no React, no Firebase. Consumers own storage (personal genres live on the user; suggestions
 * in genreSuggestions) and wiring. Locked in genres.test.ts.
 */

export interface CanonicalGenre {
  /** Stable kebab-case id — the stored value. Never changes even if the label is re-worded. */
  id: string;
  label: string;
  /** Every historical spelling / shorthand that should resolve to this id (match-keyed, so casing
   *  and punctuation don't matter). The alias table carries the migration. */
  aliases: string[];
  /** Typical word-count range as a display string ("90,000 – 120,000", en-dash). Absent → the
   *  generic fallback (GENERIC_WORD_COUNT_RANGE) is used. */
  wordCountRange?: string;
}

/** A user-invented genre. `id` is `u:{uid}:{slug}`; behaves like a canonical one for that user. */
export interface PersonalGenre {
  id: string;
  label: string;
}

/** Fallback range for genres with no specific guidance (incl. every personal genre — 3f). */
export const GENERIC_WORD_COUNT_RANGE = "70,000 – 100,000";
export const MAX_PERSONAL_GENRES = 10;
export const MAX_GENRE_LABEL_LEN = 40;
export const PERSONAL_ID_PREFIX = "u:";

/**
 * The canonical taxonomy — union of the legacy manuscript list (PREDEFINED_GENRES) and agent list
 * (AGENT_GENRES), de-conflicted. Labels are sentence-case (agent-list house style). Ranges seeded
 * from the legacy genreWordCountRange outputs; age-implying genres carry their category range.
 */
export const CANONICAL_GENRES: CanonicalGenre[] = [
  { id: "literary-fiction", label: "Literary fiction", aliases: ["litfic", "lit fic", "literary"], wordCountRange: "70,000 – 100,000" },
  { id: "commercial-fiction", label: "Commercial fiction", aliases: ["commercial", "book club", "book-club fiction"], wordCountRange: "70,000 – 100,000" },
  { id: "upmarket-fiction", label: "Upmarket fiction", aliases: ["upmarket"], wordCountRange: "70,000 – 100,000" },
  { id: "womens-fiction", label: "Women's fiction", aliases: ["womens fiction", "women’s fiction"], wordCountRange: "70,000 – 100,000" },
  { id: "historical-fiction", label: "Historical fiction", aliases: ["historical", "histfic", "hist fic"], wordCountRange: "70,000 – 100,000" },
  { id: "contemporary", label: "Contemporary", aliases: ["contemporary fiction"], wordCountRange: "70,000 – 90,000" },
  { id: "fantasy", label: "Fantasy", aliases: ["epic fantasy", "high fantasy", "low fantasy"], wordCountRange: "90,000 – 120,000" },
  { id: "science-fiction", label: "Science fiction", aliases: ["scifi", "sci-fi", "sci fi", "sf"], wordCountRange: "90,000 – 120,000" },
  { id: "speculative-fiction", label: "Speculative fiction", aliases: ["speculative", "spec fic", "spec-fic"], wordCountRange: "90,000 – 120,000" },
  { id: "romantasy", label: "Romantasy", aliases: ["romantic fantasy", "fantasy romance"], wordCountRange: "90,000 – 120,000" },
  { id: "dystopian", label: "Dystopian", aliases: ["dystopia", "dystopian fiction"], wordCountRange: "90,000 – 120,000" },
  { id: "magical-realism", label: "Magical realism", aliases: ["magic realism"], wordCountRange: "80,000 – 100,000" },
  { id: "horror", label: "Horror", aliases: ["gothic horror", "gothic"], wordCountRange: "70,000 – 90,000" },
  { id: "romance", label: "Romance", aliases: ["rom", "romcom", "rom-com", "romantic comedy"], wordCountRange: "70,000 – 90,000" },
  { id: "thriller", label: "Thriller", aliases: ["psychological thriller", "domestic thriller"], wordCountRange: "70,000 – 90,000" },
  { id: "mystery", label: "Mystery", aliases: ["whodunit", "whodunnit"], wordCountRange: "70,000 – 90,000" },
  { id: "crime", label: "Crime", aliases: ["crime fiction", "noir"], wordCountRange: "70,000 – 90,000" },
  { id: "cosy-crime", label: "Cosy crime", aliases: ["cozy crime", "cosy mystery", "cozy mystery"], wordCountRange: "70,000 – 90,000" },
  { id: "action-adventure", label: "Action & adventure", aliases: ["action", "adventure", "action adventure"], wordCountRange: "80,000 – 100,000" },
  { id: "young-adult", label: "Young adult", aliases: ["ya"], wordCountRange: "50,000 – 80,000" },
  { id: "middle-grade", label: "Middle grade", aliases: ["mg"], wordCountRange: "30,000 – 55,000" },
  { id: "childrens", label: "Children's", aliases: ["children", "childrens", "children’s", "kidlit", "kid lit"] },
  { id: "picture-book", label: "Picture book", aliases: ["picture books"], wordCountRange: "300 – 800" },
  { id: "memoir", label: "Memoir", aliases: ["memoirs"], wordCountRange: "70,000 – 90,000" },
  { id: "non-fiction", label: "Non-fiction", aliases: ["nonfiction", "non fiction", "nf"], wordCountRange: "70,000 – 90,000" },
  { id: "narrative-non-fiction", label: "Narrative non-fiction", aliases: ["narrative nonfiction", "creative non-fiction", "creative nonfiction"], wordCountRange: "70,000 – 90,000" },
];

/** Lowercase, fold `&`→"and", strip punctuation to spaces, collapse — the comparison key. So
 *  "Sci-Fi", "sci fi" and "SCIFI"→"sci fi"/"scifi" all normalise to a stable form. */
export function matchKey(raw: string): string {
  return String(raw)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tidy a raw entry into a display label: trim, collapse whitespace, cap length. Preserves the
 *  user's own casing/apostrophes (unlike matchKey). */
export function cleanGenreLabel(raw: string): string {
  return String(raw).trim().replace(/\s+/g, " ").slice(0, MAX_GENRE_LABEL_LEN);
}

/** Junk = nothing worth storing: too short, or no letters (digits-only / symbols). */
export function isJunkGenre(raw: string): boolean {
  const c = cleanGenreLabel(raw);
  return c.length < 2 || !/[a-z]/i.test(c);
}

export function isPersonalId(id: string): boolean {
  return id.startsWith(PERSONAL_ID_PREFIX);
}

/** Personal id for a user's invented genre: `u:{uid}:{slug}`. */
export function personalGenreId(uid: string, raw: string): string {
  const slug = matchKey(raw).replace(/\s+/g, "-");
  return `${PERSONAL_ID_PREFIX}${uid}:${slug}`;
}

// One-time index: every canonical label + alias, match-keyed, → id.
const CANON_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const g of CANONICAL_GENRES) {
    m.set(matchKey(g.label), g.id);
    for (const a of g.aliases) m.set(matchKey(a), g.id);
  }
  return m;
})();
const CANON_BY_ID: Map<string, CanonicalGenre> = new Map(CANONICAL_GENRES.map((g) => [g.id, g]));

export function canonicalGenreById(id: string): CanonicalGenre | undefined {
  return CANON_BY_ID.get(id);
}

/**
 * Resolution — the guardrail pipeline (3b). Normalise → alias/canonical → the user's personal list
 * → (only if all three miss, and under the cap) a NEW personal genre. Reject junk outright.
 */
export type GenreResolution =
  | { status: "canonical"; id: string; label: string }
  | { status: "personal"; id: string; label: string }
  | { status: "new-personal"; id: string; label: string }
  | { status: "rejected"; reason: string }
  | { status: "at-limit"; reason: string };

export function resolveGenre(raw: string, uid: string, personal: PersonalGenre[] = []): GenreResolution {
  const label = cleanGenreLabel(raw);
  if (isJunkGenre(raw)) return { status: "rejected", reason: "That doesn’t look like a genre." };

  const key = matchKey(raw);
  const canonId = CANON_INDEX.get(key);
  if (canonId) return { status: "canonical", id: canonId, label: CANON_BY_ID.get(canonId)!.label };

  const existing = personal.find((p) => matchKey(p.label) === key);
  if (existing) return { status: "personal", id: existing.id, label: existing.label };

  if (personal.length >= MAX_PERSONAL_GENRES) {
    return { status: "at-limit", reason: `You’ve reached the limit of ${MAX_PERSONAL_GENRES} of your own genres.` };
  }
  return { status: "new-personal", id: personalGenreId(uid, raw), label };
}

/** Display label for a stored id. Canonical → its label; personal → the registry label, else a
 *  slug-derived label so an orphaned personal id never renders as raw machine text. */
export function genreLabel(id: string, personal: PersonalGenre[] = []): string {
  const canon = CANON_BY_ID.get(id);
  if (canon) return canon.label;
  const p = personal.find((x) => x.id === id);
  if (p) return p.label;
  if (isPersonalId(id)) {
    const slug = id.slice(id.lastIndexOf(":") + 1).replace(/-/g, " ").trim();
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : id;
  }
  return id;
}

/** Word-count range for a stored genre id, always a usable string (3f: personal → generic). */
export function wordCountRangeForGenre(id: string | undefined, personal: PersonalGenre[] = []): string {
  if (!id) return GENERIC_WORD_COUNT_RANGE;
  const canon = CANON_BY_ID.get(id);
  return canon?.wordCountRange ?? GENERIC_WORD_COUNT_RANGE;
}

/** The full pickable set for a user: canonical + their personal genres. */
export function genresForUser(personal: PersonalGenre[] = []): Array<CanonicalGenre | PersonalGenre> {
  return [...CANONICAL_GENRES, ...personal];
}

/**
 * Migration helper (3e): map a legacy free-text genre label to a stored id WITHOUT inventing.
 * Canonical/alias hit → that id. A miss returns `unmapped` (the caller REPORTS it; it does not
 * guess). Personal creation during migration is the caller's decision, not this function's.
 */
export function mapLegacyGenre(label: string): { id: string; label: string } | { unmapped: string } {
  if (isJunkGenre(label)) return { unmapped: cleanGenreLabel(label) };
  const canonId = CANON_INDEX.get(matchKey(label));
  if (canonId) return { id: canonId, label: CANON_BY_ID.get(canonId)!.label };
  return { unmapped: cleanGenreLabel(label) };
}

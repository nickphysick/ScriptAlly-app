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
import { normaliseAgeCategory } from "./ageCategories";

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
  /** Manuscripts v28 — a sub-genre names its main genre (a canonical id). It inherits the parent's word-count range
   *  unless it states its own, and counts as its parent wherever genres are matched (`genreAndAncestors`). */
  parent?: string;
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
  { id: "fantasy", label: "Fantasy", aliases: ["high fantasy", "low fantasy"], wordCountRange: "90,000 – 120,000" },
  { id: "science-fiction", label: "Science fiction", aliases: ["scifi", "sci-fi", "sci fi", "sf"], wordCountRange: "90,000 – 120,000" },
  { id: "speculative-fiction", label: "Speculative fiction", aliases: ["speculative", "spec fic", "spec-fic"], wordCountRange: "90,000 – 120,000" },
  { id: "romantasy", label: "Romantasy", aliases: ["romantic fantasy", "fantasy romance"], wordCountRange: "90,000 – 120,000" },
  { id: "dystopian", label: "Dystopian", aliases: ["dystopia", "dystopian fiction"], wordCountRange: "90,000 – 120,000" },
  { id: "magical-realism", label: "Magical realism", aliases: ["magic realism"], wordCountRange: "80,000 – 100,000" },
  { id: "horror", label: "Horror", aliases: [], wordCountRange: "70,000 – 90,000" },
  { id: "romance", label: "Romance", aliases: ["rom"], wordCountRange: "70,000 – 90,000" },
  { id: "thriller", label: "Thriller", aliases: [], wordCountRange: "70,000 – 90,000" },
  { id: "mystery", label: "Mystery", aliases: [], wordCountRange: "70,000 – 90,000" },
  { id: "crime", label: "Crime", aliases: ["crime fiction"], wordCountRange: "70,000 – 90,000" },
  { id: "cosy-crime", label: "Cosy crime", aliases: ["cozy crime"], wordCountRange: "70,000 – 90,000" },
  { id: "action-adventure", label: "Action & adventure", aliases: ["action", "adventure", "action adventure"], wordCountRange: "80,000 – 100,000" },
  { id: "young-adult", label: "Young adult", aliases: ["ya"], wordCountRange: "50,000 – 80,000" },
  { id: "middle-grade", label: "Middle grade", aliases: ["mg"], wordCountRange: "30,000 – 55,000" },
  { id: "childrens", label: "Children's", aliases: ["children", "childrens", "children’s", "kidlit", "kid lit"] },
  { id: "picture-book", label: "Picture book", aliases: ["picture books"], wordCountRange: "300 – 800" },
  { id: "memoir", label: "Memoir", aliases: ["memoirs"], wordCountRange: "70,000 – 90,000" },
  { id: "non-fiction", label: "Non-fiction", aliases: ["nonfiction", "non fiction", "nf"], wordCountRange: "70,000 – 90,000" },
  { id: "narrative-non-fiction", label: "Narrative non-fiction", aliases: ["narrative nonfiction", "creative non-fiction", "creative nonfiction"], wordCountRange: "70,000 – 90,000" },
  /* ── Manuscripts v28 Part D2 — SUB-GENRES. Each names its parent (a main genre above), inherits the parent's
     word-count range, and counts as the parent wherever genres are matched (`genreAndAncestors`). Agents' pickers
     list main genres only; sub-genres appear only in the manuscript picker. ── */
  { id: "psychological-thriller", label: "Psychological thriller", aliases: [], parent: "thriller" },
  { id: "domestic-thriller", label: "Domestic thriller", aliases: [], parent: "thriller" },
  { id: "legal-thriller", label: "Legal thriller", aliases: [], parent: "thriller" },
  { id: "political-thriller", label: "Political thriller", aliases: [], parent: "thriller" },
  { id: "spy-thriller", label: "Spy thriller", aliases: [], parent: "thriller" },
  { id: "techno-thriller", label: "Techno-thriller", aliases: [], parent: "thriller" },
  { id: "medical-thriller", label: "Medical thriller", aliases: [], parent: "thriller" },
  { id: "conspiracy-thriller", label: "Conspiracy thriller", aliases: [], parent: "thriller" },
  { id: "serial-killer", label: "Serial killer thriller", aliases: [], parent: "thriller" },
  { id: "police-procedural", label: "Police procedural", aliases: [], parent: "crime" },
  { id: "noir", label: "Noir", aliases: [], parent: "crime" },
  { id: "domestic-noir", label: "Domestic noir", aliases: [], parent: "crime" },
  { id: "historical-crime", label: "Historical crime", aliases: [], parent: "crime" },
  { id: "heist", label: "Heist", aliases: [], parent: "crime" },
  { id: "nordic-noir", label: "Nordic noir", aliases: [], parent: "crime" },
  { id: "whodunnit", label: "Whodunnit", aliases: ["whodunit"], parent: "mystery" },
  { id: "locked-room", label: "Locked-room mystery", aliases: [], parent: "mystery" },
  { id: "amateur-sleuth", label: "Amateur sleuth", aliases: [], parent: "mystery" },
  { id: "cosy-mystery", label: "Cosy mystery", aliases: ["cozy mystery"], parent: "mystery" },
  { id: "historical-mystery", label: "Historical mystery", aliases: [], parent: "mystery" },
  { id: "gothic", label: "Gothic", aliases: ["gothic horror"], parent: "horror" },
  { id: "folk-horror", label: "Folk horror", aliases: [], parent: "horror" },
  { id: "supernatural", label: "Supernatural horror", aliases: [], parent: "horror" },
  { id: "psychological-horror", label: "Psychological horror", aliases: [], parent: "horror" },
  { id: "haunted-house", label: "Haunted house", aliases: [], parent: "horror" },
  { id: "body-horror", label: "Body horror", aliases: [], parent: "horror" },
  { id: "urban-fantasy", label: "Urban fantasy", aliases: [], parent: "fantasy" },
  { id: "dark-fantasy", label: "Dark fantasy", aliases: [], parent: "fantasy" },
  { id: "cosy-fantasy", label: "Cosy fantasy", aliases: [], parent: "fantasy" },
  { id: "portal-fantasy", label: "Portal fantasy", aliases: [], parent: "fantasy" },
  { id: "grimdark", label: "Grimdark", aliases: [], parent: "fantasy" },
  { id: "epic-fantasy", label: "Epic fantasy", aliases: [], parent: "fantasy" },
  { id: "historical-fantasy", label: "Historical fantasy", aliases: [], parent: "fantasy" },
  { id: "fairytale-retelling", label: "Fairytale retelling", aliases: [], parent: "fantasy" },
  { id: "myth-retelling", label: "Myth retelling", aliases: [], parent: "fantasy" },
  { id: "sword-and-sorcery", label: "Sword and sorcery", aliases: [], parent: "fantasy" },
  { id: "space-opera", label: "Space opera", aliases: [], parent: "science-fiction" },
  { id: "cyberpunk", label: "Cyberpunk", aliases: [], parent: "science-fiction" },
  { id: "climate-fiction", label: "Climate fiction", aliases: [], parent: "science-fiction" },
  { id: "time-travel", label: "Time travel", aliases: [], parent: "science-fiction" },
  { id: "hard-sf", label: "Hard science fiction", aliases: [], parent: "science-fiction" },
  { id: "post-apocalyptic", label: "Post-apocalyptic", aliases: [], parent: "science-fiction" },
  { id: "first-contact", label: "First contact", aliases: [], parent: "science-fiction" },
  { id: "military-sf", label: "Military science fiction", aliases: [], parent: "science-fiction" },
  { id: "romcom", label: "Romantic comedy", aliases: ["romcom", "rom-com"], parent: "romance" },
  { id: "historical-romance", label: "Historical romance", aliases: [], parent: "romance" },
  { id: "contemporary-romance", label: "Contemporary romance", aliases: [], parent: "romance" },
  { id: "paranormal-romance", label: "Paranormal romance", aliases: [], parent: "romance" },
  { id: "regency", label: "Regency romance", aliases: [], parent: "romance" },
  { id: "dark-romance", label: "Dark romance", aliases: [], parent: "romance" },
  { id: "sports-romance", label: "Sports romance", aliases: [], parent: "romance" },
  { id: "romantic-suspense", label: "Romantic suspense", aliases: [], parent: "romance" },
  { id: "autofiction", label: "Autofiction", aliases: [], parent: "literary-fiction" },
  { id: "coming-of-age", label: "Coming of age", aliases: [], parent: "literary-fiction" },
  { id: "satire", label: "Satire", aliases: [], parent: "literary-fiction" },
  { id: "campus-novel", label: "Campus novel", aliases: [], parent: "literary-fiction" },
  { id: "experimental", label: "Experimental fiction", aliases: [], parent: "literary-fiction" },
  { id: "literary-thriller", label: "Literary thriller", aliases: [], parent: "literary-fiction" },
  { id: "alternate-history", label: "Alternate history", aliases: [], parent: "historical-fiction" },
  { id: "family-saga", label: "Family saga", aliases: [], parent: "historical-fiction" },
  { id: "dual-timeline", label: "Dual timeline", aliases: [], parent: "historical-fiction" },
  { id: "wartime", label: "Wartime fiction", aliases: [], parent: "historical-fiction" },
  { id: "tudor", label: "Tudor fiction", aliases: [], parent: "historical-fiction" },
  { id: "victorian", label: "Victorian fiction", aliases: [], parent: "historical-fiction" },
  { id: "uplit", label: "Up-lit", aliases: [], parent: "commercial-fiction" },
  { id: "comic-fiction", label: "Comic fiction", aliases: [], parent: "commercial-fiction" },
  { id: "military-fiction", label: "Military fiction", aliases: [], parent: "action-adventure" },
];

/** Lowercase, fold `&`→"and", strip punctuation to spaces, collapse — the comparison key. So
 *  "Sci-Fi", "sci fi" and "SCIFI"→"sci fi"/"scifi" all normalise to a stable form. */
/**
 * A SHORTCUT LIST per age category — the handful of genres offered as one-click pills before the
 * writer types anything, and nothing more than that.
 *
 * ⚠️ IT IS A SHORTCUT, NOT A RECOMMENDATION, AND NOT A CONSTRAINT. Every canonical genre stays
 * reachable by typing for every category; these are simply the ones a writer in that category most
 * often reaches for, so the common case is one click instead of eight keystrokes. Nothing validates
 * against it and nothing warns when a choice is absent from it — a Middle Grade horror is a real
 * book, and the picker must never imply otherwise.
 *
 * ⚠️ EDITORIAL JUDGEMENT WITH NOTHING DERIVING FROM IT. There is no age dimension in
 * CANONICAL_GENRES and this does not add one; it is a per-category ordering of existing ids. An
 * unknown category yields an empty list, which renders no pills rather than a wrong set.
 */
export const COMMON_GENRES_BY_AGE: Record<string, string[]> = {
  /* Manuscripts v28 Part E: keyed by the UK labels; commonGenresFor reads old spellings through the normaliser */
  "Picture book": ["picture-book", "childrens"],
  "Young fiction": ["childrens", "action-adventure", "fantasy"],
  "Middle grade": ["middle-grade", "fantasy", "action-adventure", "mystery", "contemporary"],
  "Young adult": ["young-adult", "fantasy", "contemporary", "romance", "thriller", "dystopian"],
  Adult: ["literary-fiction", "commercial-fiction", "crime", "thriller", "romance", "fantasy", "historical-fiction"],
};

/** The shortcut pills for a category — empty for an unknown one, so nothing wrong is offered. */
export function commonGenresFor(ageCategory: string | undefined): string[] {
  return COMMON_GENRES_BY_AGE[normaliseAgeCategory(ageCategory) ?? (ageCategory ?? "").trim()] ?? [];
}

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
 * The canonical id a stored or typed genre stands for — itself when it IS a canonical id, the id its label
 * or alias resolves to otherwise, and null when it is neither (a personal genre, or free text). Contact list
 * v14 (Q5) compares genres through this, so "science-fiction" (an agent's stored id) and "Science fiction"
 * (a manuscript's label) are the same genre — the old lower-case comparison only matched one-word genres.
 */
export function canonicalIdOf(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (CANON_BY_ID.has(s)) return s;
  return CANON_INDEX.get(matchKey(s)) ?? null;
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
  /* v28: a sub-genre inherits its parent's range unless it states its own */
  const parent = canon?.parent ? CANON_BY_ID.get(canon.parent) : undefined;
  return canon?.wordCountRange ?? parent?.wordCountRange ?? GENERIC_WORD_COUNT_RANGE;
}

/**
 * Manuscripts v28 Part D2 — A GENRE AND EVERYTHING IT COUNTS AS: a canonical id, then its parent, then the parent's
 * parent. A psychological thriller is also a thriller, so an agent who lists Thriller takes it. EVERY matcher goes
 * through this one helper (genreMatch's `bookGenreHit` and `isGenreMatch`, communityMatch's genre score); a value
 * the taxonomy does not know is just itself.
 */
export function genreAndAncestors(id: string): string[] {
  const out: string[] = [];
  let cur: string | undefined = id;
  while (cur && !out.includes(cur)) {
    out.push(cur);
    cur = CANON_BY_ID.get(cur)?.parent;
  }
  return out;
}
/** The main genres only: what an agent's genre pickers and filters list. */
export const MAIN_GENRES: CanonicalGenre[] = CANONICAL_GENRES.filter((g) => !g.parent);

/** The full pickable set for a user: canonical + their personal genres. */
export function genresForUser(personal: PersonalGenre[] = []): Array<CanonicalGenre | PersonalGenre> {
  return [...CANONICAL_GENRES, ...personal];
}

/**
 * Read-time tolerance (3e) — the effective id for a STORED value, whatever form it's in. New writes
 * store canonical/personal ids; legacy records still hold label strings. This folds all three:
 *  - already a canonical id → itself.
 *  - a personal id → itself, EXCEPT a personal id whose slug now matches a promoted canonical genre,
 *    which auto-upgrades (3c — "no user ever re-tags anything").
 *  - a legacy label → its canonical id via the alias table, else a matching personal id, else the
 *    label verbatim (never dropped, never invented).
 */
export function normaliseStoredGenre(value: string, personal: PersonalGenre[] = []): string {
  if (CANON_BY_ID.has(value)) return value;
  if (isPersonalId(value)) {
    const slug = value.slice(value.lastIndexOf(":") + 1).replace(/-/g, " ");
    return CANON_INDEX.get(matchKey(slug)) ?? value;
  }
  const canon = CANON_INDEX.get(matchKey(value));
  if (canon) return canon;
  const p = personal.find((x) => matchKey(x.label) === matchKey(value));
  return p ? p.id : value;
}

/** Display label for ANY stored value — canonical id, personal id, or a legacy label string. */
export function genreDisplay(value: string, personal: PersonalGenre[] = []): string {
  const id = normaliseStoredGenre(value, personal);
  const canon = CANON_BY_ID.get(id);
  if (canon) return canon.label;
  if (isPersonalId(id)) return genreLabel(id, personal);
  return cleanGenreLabel(id); // unmapped legacy label — shown as-is, honestly
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

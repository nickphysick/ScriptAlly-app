/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source of truth for manuscript entry: the predefined lists, the genre word-count
 * range lookup (drives the muted placeholder everywhere a manuscript is entered), the
 * primary+sub genre accessor, and one payload/limit-check helper so onboarding and
 * AddManuscriptFocusForm never diverge into two manuscript writers.
 */
import { Manuscript, ManuscriptStatus, UserPlan } from "../types";

export const PREDEFINED_GENRES = [
  "Literary Fiction",
  "Commercial Fiction",
  "Historical Fiction",
  "Fantasy",
  "Science Fiction",
  "Horror",
  "Romance",
  "Thriller",
  "Mystery",
  "Crime",
  "Young Adult",
  "Middle Grade",
  "Memoir",
  "Non-fiction",
  "Narrative Non-fiction",
  "Children's",
];

export const AGE_CATEGORIES = ["Picture Book", "Early Reader", "Middle Grade", "Young Adult", "Adult"];

/** Common shorthand → canonical PREDEFINED_GENRES. The allow-list above stays authoritative; this
 *  just maps the messy ways writers' spreadsheets spell genres onto it. Unknown → dropped. */
const GENRE_ALIASES: Record<string, string> = {
  "litfic": "Literary Fiction", "lit fic": "Literary Fiction", "literary": "Literary Fiction",
  "commercial": "Commercial Fiction", "upmarket": "Commercial Fiction", "book club": "Commercial Fiction",
  "historical": "Historical Fiction", "histfic": "Historical Fiction", "hist fic": "Historical Fiction",
  "fantasy": "Fantasy", "epic fantasy": "Fantasy", "romantasy": "Fantasy", "high fantasy": "Fantasy",
  "scifi": "Science Fiction", "sci-fi": "Science Fiction", "sci fi": "Science Fiction", "sf": "Science Fiction", "speculative": "Science Fiction", "spec fic": "Science Fiction",
  "horror": "Horror",
  "romance": "Romance", "rom": "Romance", "romcom": "Romance", "rom-com": "Romance",
  "thriller": "Thriller", "psychological thriller": "Thriller",
  "mystery": "Mystery", "cosy mystery": "Mystery", "cozy mystery": "Mystery",
  "crime": "Crime", "noir": "Crime",
  "ya": "Young Adult", "young adult": "Young Adult",
  "mg": "Middle Grade", "middle grade": "Middle Grade",
  "memoir": "Memoir",
  "nonfiction": "Non-fiction", "non fiction": "Non-fiction", "non-fiction": "Non-fiction", "nf": "Non-fiction",
  "narrative nonfiction": "Narrative Non-fiction", "narrative non-fiction": "Narrative Non-fiction",
  "children": "Children's", "childrens": "Children's", "children's": "Children's", "kidlit": "Children's", "picture book": "Children's",
};
const GENRE_SPLIT = /[,/;|]+|\s+&\s+|\s+and\s+/i;
const GENERIC = new Set(["fiction", "book", "books", "genre", "genres", "novel", "novels", "general"]);

/** Validate/normalise raw genre text (from a Smart Import sheet) against PREDEFINED_GENRES: exact
 *  match, then alias, then a meaningful-word contains. Unrecognised tokens are dropped (never
 *  invented); the result is de-duplicated in allow-list order. */
export function normaliseGenres(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  const tokens = (Array.isArray(raw) ? raw : [raw])
    .flatMap((s) => String(s).split(GENRE_SPLIT))
    .map((t) => t.trim().replace(/[.]+$/, "").toLowerCase())
    .filter(Boolean);
  const lower = PREDEFINED_GENRES.map((g) => g.toLowerCase());
  const matched = new Set<string>();
  for (const t of tokens) {
    const exact = lower.indexOf(t);
    if (exact >= 0) { matched.add(PREDEFINED_GENRES[exact]); continue; }
    if (GENRE_ALIASES[t]) { matched.add(GENRE_ALIASES[t]); continue; }
    if (t.length >= 4 && !GENERIC.has(t)) {
      const ci = lower.findIndex((g) => g.split(/\W+/).includes(t) || g.startsWith(t));
      if (ci >= 0) matched.add(PREDEFINED_GENRES[ci]);
    }
  }
  return PREDEFINED_GENRES.filter((g) => matched.has(g)); // de-duped, allow-list order
}

/** FREE plan allows a single active manuscript profile. */
export const FREE_MANUSCRIPT_LIMIT = 1;

/**
 * Typical word-count range for a (ageCategory, primary genre) pair, as a display string
 * ("70,000 – 100,000"). Used only as a muted input placeholder — never pre-fill a value.
 * Returns null when there's no sensible range yet (e.g. no genre chosen).
 * Seeded from the existing wordCountFeedback ranges + standard category guidance.
 */
export function genreWordCountRange(ageCategory?: string, genre?: string): string | null {
  const age = (ageCategory || "").trim();
  const g = (genre || "").trim().toLowerCase();

  // Age category dominates for young readers — genre barely shifts these.
  if (age === "Picture Book") return "300 – 800";
  if (age === "Early Reader") return "5,000 – 10,000";
  if (age === "Middle Grade" || g === "middle grade") return "30,000 – 55,000";
  if (age === "Young Adult" || g === "young adult") return "50,000 – 80,000";

  // Adult (and anything unspecified) refines by genre.
  if (!g) return null;
  if (g.includes("fantasy") || g.includes("science fiction") || g.includes("sci-fi")) return "90,000 – 120,000";
  if (g.includes("romance")) return "70,000 – 90,000";
  if (g.includes("thriller") || g.includes("mystery") || g.includes("crime") || g.includes("horror"))
    return "70,000 – 90,000";
  if (g.includes("memoir") || g.includes("non-fiction")) return "70,000 – 90,000";
  if (g.includes("literary") || g.includes("commercial") || g.includes("historical")) return "70,000 – 100,000";

  // Generic adult fiction fallback.
  return "70,000 – 100,000";
}

/** Primary genre plus any sub-genres, deduped and trimmed, for display and agent matching. */
export function manuscriptGenres(m: Pick<Manuscript, "genre" | "subGenres">): string[] {
  const out: string[] = [];
  const push = (v?: string) => {
    const t = (v || "").trim();
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  };
  push(m.genre);
  (m.subGenres || []).forEach(push);
  return out;
}

export interface ManuscriptDraft {
  title: string;
  genre: string;
  subGenres?: string[];
  ageCategory: string;
  wordCount?: number;
  logline?: string;
  comparableTitles?: string;
  notes?: string;
  status: ManuscriptStatus;
  shelvedReason?: string;
}

/**
 * Build the addManuscript payload from a draft. The single payload shape used by every entry
 * point (onboarding branches + AddManuscriptFocusForm). The actual write still goes through
 * useScriptAllyDb.addManuscript — the one writer.
 */
export function buildManuscriptPayload(
  d: ManuscriptDraft
): Omit<Manuscript, "id" | "userId" | "statusChangedDate"> {
  return {
    title: d.title.trim(),
    genre: d.genre.trim(),
    subGenres: (d.subGenres || []).map((s) => s.trim()).filter(Boolean),
    ageCategory: d.ageCategory,
    wordCount: d.wordCount ?? 0,
    logline: (d.logline || "").trim(),
    comparableTitles: (d.comparableTitles || "").trim(),
    status: d.status,
    notes: (d.notes || "").trim(),
    ...(d.status === ManuscriptStatus.SHELVED && d.shelvedReason
      ? { shelvedReason: d.shelvedReason.trim() }
      : {}),
  };
}

/** FREE-tier manuscript limit message, or null when within limit. Mirrors db.addManuscript. */
export function manuscriptLimitError(plan: UserPlan | undefined, existingCount: number): string | null {
  if (plan === UserPlan.FREE && existingCount >= FREE_MANUSCRIPT_LIMIT) {
    return "Free Tier limit reached: You can only configure 1 active manuscript profile. Upgrade to Pro for unlimited additions!";
  }
  return null;
}

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

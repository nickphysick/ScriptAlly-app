/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Onboarding v9 — the words and the small rules of the three set-up steps (design-refs/
 * onboarding-v9). Stated once so the screens, the lab and the locks read one set. Pure: no React.
 */

/* ── Step 1 · the welcome ─────────────────────────────────────────────────────────────────── */
export const WELCOME_EYEBROW = "Welcome";
export const WELCOME_SECOND = "Let's get you on board.";
export const WELCOME_LINE = "To make your set-up as quick as possible, let us know where you are in your querying journey.";
/** The first word of the account's display name, or "" when there is none. */
export const firstNameOf = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] ?? "";
/** The heading's two lines. With no name the first line drops it. */
export function welcomeHeading(name: string | null | undefined): [string, string] {
  const first = firstNameOf(name);
  return [first ? `Welcome to QueryHawk, ${first}.` : "Welcome to QueryHawk.", WELCOME_SECOND];
}

/* ── Step 2 · the acknowledgement and the title ───────────────────────────────────────────── */
export type V9Stage = "starting" | "early" | "deep" | "interest";
export const STAMP_EYEBROW = "Where you are";
export const STAMP_CHANGE = "Change";

/** One run of a passage line. `em` runs are italic, 600. */
export interface Run { text: string; em?: boolean }
/** The three lines: the first in the typewriter face, the next two in the serif. */
export type Passage = [Run[], Run[], Run[]];
const line = (text: string): Run[] => [{ text }];
const FIRST_TITLE: Run[] = [{ text: "First, your " }, { text: "manuscript title", em: true }, { text: "." }];

export const ACK: Record<V9Stage, Passage> = {
  early: [
    line("Got it. Your campaign is underway."),
    line("QueryHawk picks up from wherever you've got to. In a moment we'll give you hassle-free ways to import whatever list you're working from."),
    FIRST_TITLE,
  ],
  starting: [
    line("Got it. You're at the start."),
    line("QueryHawk records your querying from the first agent you look at. Nothing to piece together later."),
    [{ text: "First, your " }, { text: "manuscript", em: true }, { text: ", if it has a title yet." }],
  ],
  deep: [
    line("Got it. A lot in flight."),
    line("Who has what, and when each one is due a nudge: that's the job QueryHawk does. In a moment we'll give you hassle-free ways to import the list you're working from."),
    FIRST_TITLE,
  ],
  interest: [
    line("Got it. Something's on the table."),
    line("Requests and offers set the pace. QueryHawk keeps them in view alongside everything still waiting. In a moment we'll give you ways to import the list you're working from."),
    FIRST_TITLE,
  ],
};
export const lineText = (runs: readonly Run[]): string => runs.map((r) => r.text).join("");

export const TITLE_LABEL = "Manuscript title";
export const TITLE_PLACEHOLDER = "e.g. The October Test";
export const TITLE_TBC = "Title TBC";
/** What `Title TBC` puts in the field. It is held like any other title until the flow's one write. */
export const UNTITLED = "Untitled manuscript";
export const READINESS_Q = "Your manuscript is…";
export const STILL_WRITING_LEAD = "Still writing?";
export const STILL_WRITING_NOTE =
  "No problem. In the meantime, QueryHawk's smart database is a great place to build up your agent contact list and collate your materials.";

/* ── The typewriter ────────────────────────────────────────────────────────────────────────
   Letter by letter, no cursor. The first line at 38ms a letter, the serif lines at 13ms, and
   220ms more after each full stop. `typeSchedule` gives the moment (ms from the start) at which
   each character of the joined lines has appeared; the last entry is the whole passage's length. */
export const TYPE_LEAD_MS = 38;
export const TYPE_BODY_MS = 13;
export const TYPE_STOP_MS = 220;
export function typeSchedule(lines: readonly string[], leadMs = TYPE_LEAD_MS, bodyMs = TYPE_BODY_MS, stopMs = TYPE_STOP_MS): number[] {
  const at: number[] = [];
  let t = 0;
  lines.forEach((text, li) => {
    const per = li === 0 ? leadMs : bodyMs;
    for (const ch of text) {
      t += per;
      at.push(t);
      if (ch === ".") t += stopMs;
    }
  });
  return at;
}
/** How many characters have appeared by `elapsed` ms. */
export function typedCount(schedule: readonly number[], elapsed: number): number {
  let lo = 0, hi = schedule.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (schedule[mid] <= elapsed) lo = mid + 1; else hi = mid; }
  return lo;
}

/* ── Step 2, continued · your book ────────────────────────────────────────────────────────── */
export const BOOK_EYEBROW = "— Your book —";
export const bookByline = (name: string | null | undefined): string | null => {
  const n = (name ?? "").trim();
  return n ? `by ${n}` : null;
};
export const BOOK_CARD_H = "Tell us a bit more about it.";
/** The long form: the app does match agents on a manuscript's genres (lib/genreMatch.ts). */
export const BOOK_CARD_SUB = "Each of these helps QueryHawk match you with the right agents and sense-check your list. None is set in stone.";
export const GENRE_LABEL = "Genre";
export const GENRE_HELPER = "Pick every genre that fits. The first you pick is the primary; press another you've picked to make it the primary instead.";
export const GENRE_SEARCH = "Search all genres…";
export const GENRE_SEARCH_FOOT = "Pick from the list; it joins your pills above. Can't find yours? Choose the nearest.";
export const AGE_LABEL = "Age category";
export const WORDS_LABEL = "Word count";
export const WORDS_PLACEHOLDER = "e.g. 85,000";
export const WORDS_HELPER = "The full manuscript, as it stands today.";
export const WORDS_OVER = "That's over 500,000 words. Check the number.";
export const WORDS_UNDER = "That's under 1,000 words. Check the number.";
export const WORDS_MIN = 1000;
export const WORDS_MAX = 500000;

/**
 * The nine genre pills, by the taxonomy's ids (lib/genres.ts). The mock draws eight, with one
 * "Crime & thriller"; those are two genres in the taxonomy, so they are two pills (ruled 11 Oct).
 */
export const GENRE_PILLS: readonly string[] = [
  "crime", "thriller", "literary-fiction", "fantasy", "romance", "historical-fiction", "science-fiction", "womens-fiction", "horror",
];

/**
 * The genres picked, in order: the first is the primary.
 *   · pressing an unpicked genre adds it (the first one picked becomes the primary);
 *   · pressing a picked genre that is not the primary makes it the primary;
 *   · pressing the primary removes it, and the next picked becomes the primary.
 */
export function pressGenre(picked: readonly string[], id: string): string[] {
  const at = picked.indexOf(id);
  if (at === -1) return [...picked, id];
  if (at === 0) return picked.slice(1);
  return [id, ...picked.filter((g) => g !== id)];
}
/** Adding from the search: joins the picks if it is not there already; never removes or reorders. */
export const addGenre = (picked: readonly string[], id: string): string[] => (picked.includes(id) ? [...picked] : [...picked, id]);

/** One search result: the genre, and where the typed part sits in its label (for the bold). */
export interface GenreHit { id: string; label: string; start: number; length: number }
/** Genres from the fixed list whose label holds what was typed. Nothing outside the list is ever offered. */
export function searchGenreList(list: readonly { id: string; label: string }[], typed: string, picked: readonly string[] = []): GenreHit[] {
  const q = typed.trim().toLowerCase();
  if (!q) return [];
  return list
    .map((g) => ({ id: g.id, label: g.label, start: g.label.toLowerCase().indexOf(q), length: q.length }))
    .filter((h) => h.start !== -1 && !picked.includes(h.id))
    .sort((a, b) => a.start - b.start || a.label.localeCompare(b.label));
}

/**
 * What each age category means. Keyed by the shared list's own labels (lib/manuscripts
 * `AGE_CATEGORIES`): the mock's "Chapter book" is "Young fiction" (it was the stored "Early Reader" until v28 Part E,
 * which renamed the list to UK labels in sentence case). Titles are `em` runs.
 */
const t = (text: string): Run => ({ text, em: true });
export const AGE_NOTES: Record<string, Run[]> = {
  "Picture book": [{ text: "Read aloud to children up to about 7, told as much through pictures as words, usually under 1,000 words. Think " }, t("The Very Hungry Caterpillar"), { text: ", " }, t("The Gruffalo"), { text: ", " }, t("Where the Wild Things Are"), { text: "." }],
  "Young fiction": [{ text: "Children starting to read on their own, roughly 6 to 9. Short chapters, simple sentences, some illustration. Think " }, t("Horrid Henry"), { text: ", " }, t("The Worst Witch"), { text: ", " }, t("Mr Gum"), { text: "." }],
  "Middle grade": [{ text: "Readers roughly 8 to 12. Protagonists of that age, adventure and friendship at the heart, nothing too dark on the page. Think " }, t("Holes"), { text: ", " }, t("Wonder"), { text: ", " }, t("The Lion, the Witch and the Wardrobe"), { text: "." }],
  "Young adult": [{ text: "Readers roughly 12 to 18. Teenage protagonists, first experiences, questions of identity, often told close and in the moment. Think " }, t("The Hunger Games"), { text: ", " }, t("The Hate U Give"), { text: ", " }, t("Noughts & Crosses"), { text: "." }],
  "New adult": [{ text: "Protagonists roughly 18 to 25, leaving home and finding their feet: first jobs, university, first serious relationships. Think " }, t("Fourth Wing"), { text: ", " }, t("A Court of Thorns and Roses"), { text: ", " }, t("It Ends with Us"), { text: "." }],
  Adult: [{ text: "Written for grown-up readers: any age of protagonist, any theme, no limits on content. It's the largest market, and the one most agents list first. Think " }, t("Gone Girl"), { text: ", " }, t("The Thursday Murder Club"), { text: ", " }, t("Normal People"), { text: "." }],
};
export const ageNoteEyebrow = (category: string): string => `${category} · what this means`;

/**
 * The word count as typed. Empty is allowed (it is optional). Digits, with commas, spaces or full
 * stops as thousands separators. A value outside 1,000–500,000 is an error and stops Continue.
 */
export function readWordCount(raw: string): { value: number | null; error: string | null } {
  const text = raw.trim();
  if (!text) return { value: null, error: null };
  const n = Number(text.replace(/[\s,.]/g, ""));
  if (!Number.isFinite(n)) return { value: null, error: null };
  if (n > WORDS_MAX) return { value: n, error: WORDS_OVER };
  if (n < WORDS_MIN) return { value: n, error: WORDS_UNDER };
  return { value: n, error: null };
}
/** Keep only what a word count can hold: digits and thousands separators. */
export const cleanWordCount = (raw: string): string => raw.replace(/[^\d,.\s]/g, "");

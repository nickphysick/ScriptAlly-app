/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v29 (design-refs/manuscripts-v29/manuscripts-v29.html) — the book on the page: the pure rules the page
 * reads. Every string here is the ref's (or the pack prompt's where the ref has no case: "1 query sent for this book").
 *
 * ⚠️ NO VERDICTS. Nothing here scores, ranks or advises: the band says how many of three are written, never that one
 *    is "missing".
 * ⚠️ "since …" ONLY WHEN QUERYING AND A DATE EXISTS (baked decision 10): `sinceShown` is the one test, read by the
 *    header and the Details ledger alike.
 */
import { deleteField } from "firebase/firestore";
import type { Manuscript } from "../types";
import { ManuscriptStatus } from "../types";
import { STATUS_WORDS } from "./manuscriptV21";
import { statusWord } from "./manuscriptV27";
import { ageDisplay } from "./ageCategories";
import { MONTHS_SHORT } from "./dates";

/** The three pieces of the pitch, in the page's order, with the drawer section each opens on. */
export type PitchKey = "logline" | "elevatorPitch" | "synopsis";
export const PITCH: { k: PitchKey; h: string; tag: string; none: string; why: string; copied: string }[] = [
  { k: "logline", h: "Logline", tag: "one sentence", none: "No logline yet.", why: "The hook in a single sentence. It’s the line that opens your query letter.", copied: "Logline copied." },
  { k: "elevatorPitch", h: "Elevator pitch", tag: "30 seconds, out loud", none: "No elevator pitch yet.", why: "What you’d say if someone asked what your book’s about. Keep it on the tip of your tongue.", copied: "Elevator pitch copied." },
  { k: "synopsis", h: "Synopsis", tag: "the whole story", none: "No synopsis yet.", why: "The whole story in brief, ending included.", copied: "Synopsis copied." },
];
export const COPY_FAILED = "That didn’t copy. Select the text and copy it yourself.";
export const SAVED = "Saved the book’s details.";
export const UNDONE = "Put back as it was.";
export const SOON_LINE = "We’re working on this – watch this space.";

/** The pitch band's sub-line, by how many of the three are written. */
export const pitchSub = (written: number): string =>
  written >= 3 ? "Your book in one line, in thirty seconds and in full."
    : written <= 0 ? "Three ways of telling people what your book is. Add them when you’re ready."
      : `${written} of 3 written.`;

export const pitchText = (ms: Manuscript, k: PitchKey): string => (ms[k] ?? "").trim();
export const writtenCount = (ms: Manuscript): number => PITCH.filter((p) => pitchText(ms, p.k)).length;

/** Words in a text, as the ref counts them (runs of non-space). */
export const countWords = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);
/** The synopsis clamps to five lines only above this many words (baked decision 11). */
export const SYNOPSIS_CLAMP_WORDS = 90;

/**
 * The logline as displayed inside the page's own curly quotes: a writer's own outer quote marks are dropped from the
 * DISPLAY so the marks are never doubled. The stored text (and what Copy writes) is untouched.
 */
export const unquoted = (s: string): string => {
  const t = s.trim();
  const m = t.match(/^["“”'‘’]+([\s\S]*?)["“”'‘’]+$/);
  return m && m[1].trim() ? m[1].trim() : t;
};

/**
 * The querying-since day, or null: only when the status the page shows is Querying (a shelved flag reads Shelved,
 * `statusWord`) and the date exists. `long` gives "10 March 2026" (the Details ledger); otherwise "10 Mar 2026".
 */
export const sinceShown = (ms: Pick<Manuscript, "status" | "shelved">, since: string | null, long = false): string | null => {
  if (statusWord(ms) !== STATUS_WORDS[ManuscriptStatus.QUERYING]) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(since ?? "");
  if (!m) return null;
  const mi = Number(m[2]) - 1;
  const month = long ? MONTHS_LONG[mi] : MONTHS_SHORT[mi];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : null;
};
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** The text split for typesetting (v28.1's rule, kept from the retired QuotedLine): everything before the last word,
 *  and the last word, so the closing quote mark rides with the last word and never wraps onto a line of its own. */
export const splitLastWord = (text: string): { head: string; last: string } => {
  const t = text.trim();
  const i = t.search(/\S+$/);
  return i <= 0 ? { head: "", last: t } : { head: t.slice(0, i), last: t.slice(i) };
};

/** The main genre, and the further genres ("also fits …"), from the stored labels. */
export const mainGenre = (ms: Pick<Manuscript, "genre">): string => (ms.genre ?? "").trim();
export const alsoGenres = (ms: Pick<Manuscript, "genre" | "subGenres">): string[] => {
  const main = mainGenre(ms);
  return (ms.subGenres ?? []).map((g) => (g ?? "").trim()).filter((g) => g && g !== main);
};
export const seriesWord = (ms: Pick<Manuscript, "series">): string => ((ms.series ?? "").trim() ? "Part of a series" : "Standalone");
export { statusWord, ageDisplay };

/** The Details foot, by how many queries were sent for this book. */
export const queryFoot = (n: number): { n: number | null; text: string; link: "See them" | "Log a query" } =>
  n >= 2 ? { n, text: "queries sent for this book", link: "See them" }
    : n === 1 ? { n: 1, text: "query sent for this book", link: "See them" }
      : { n: null, text: "No queries sent for this book yet.", link: "Log a query" };

/* ══ Undo: the genuine inverse of one save ═══════════════════════════════════════════════════════════════════════ */

/** The manuscript keys firestore.rules' `isValidManuscript` requires on every write. */
const RULES_REQUIRED = new Set(["title", "genre", "ageCategory", "wordCount", "logline"]);
const isSentinel = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as { isEqual?: unknown }).isEqual === "function";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * The fields one save changed, as the write that puts them back: for each key the payload writes whose value differs
 * from the stored one, the stored value — or `deleteField()` where the key was absent before. A status move also
 * stamps `statusChangedDate` (lib/db), so that stamp is put back too. Empty when the save changed nothing.
 */
export const inverseOf = (before: Manuscript, payload: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const prev = before as unknown as Record<string, unknown>;
  for (const [k, next] of Object.entries(payload)) {
    const had = Object.prototype.hasOwnProperty.call(prev, k) && prev[k] !== undefined;
    if (isSentinel(next)) { if (had) out[k] = prev[k]; continue; }
    if (had && same(prev[k], next)) continue;
    /* a key firestore.rules requires (isValidManuscript) cannot be put back to absent — the delete would be denied and
       sink the whole Undo. A rule-valid book always has them, so this only ever meets legacy data. */
    if (!had && RULES_REQUIRED.has(k)) continue;
    out[k] = had ? prev[k] : deleteField();
  }
  if ("status" in out) {
    const had = Object.prototype.hasOwnProperty.call(prev, "statusChangedDate") && prev.statusChangedDate !== undefined;
    out.statusChangedDate = had ? prev.statusChangedDate : deleteField();
  }
  return out;
};

/** The pitch pieces whose text a save changed (the rows that flash once). */
export const pitchChanged = (before: Manuscript, payload: Record<string, unknown>): PitchKey[] =>
  PITCH.map((p) => p.k).filter((k) => {
    if (!(k in payload)) return false;
    const v = payload[k];
    const next = isSentinel(v) ? "" : String(v ?? "").trim();
    return next !== pitchText(before, k);
  });

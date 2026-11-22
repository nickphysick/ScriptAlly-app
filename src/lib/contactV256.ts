/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.6 (design-refs/contact-list-v25-6/) — At a glance's foot lines (Part B) and the List health ring's
 * tone (Part C). Pure, unit-tested.
 *
 *   Not queried   "{n} want {genre}s"        not-queried agents who take the book's FIRST genre (`takesMain`); with
 *                                            no book genre, "{n} with genres on file"
 *   Querying      "{n} waiting on you"       the Your move agents (`stand === "you"`)
 *   Closed        "{n} passed"               closed agents whose last query closed as a pass (Rejected)
 *   List health   "{n} gaps to fill"         Housekeeping's gap total
 *
 * ⚠️ A FOOT WHOSE n IS 0 IS ABSENT, never "0 passed".
 * ⚠️ "passed" is a REJECTED close only: a No Response close or a withdrawal is closed and not a pass.
 */
import { QueryStatus } from "../types";
import type { AgentFacts } from "./contactList";
import { takesMain } from "./genreMatch";
import type { GlanceKey } from "./contactV25";

export interface GlanceFoot {
  /** the number, drawn in the typewriter */
  n: number;
  /** the words after it */
  words: string;
}

/** "thriller" → "thrillers"; a genre of more than one word, or one already ending in s, is left as it is
 *  ("literary fiction", "romance" → "romances" is the one rule: a single word takes an s) */
export function genrePlural(label: string): string {
  const w = label.trim().toLowerCase();
  if (!w) return w;
  if (/\s/.test(w) || /s$/.test(w)) return w;
  return `${w}s`;
}

type FootFacts = Pick<AgentFacts, "stand" | "q"> & { agent: { genres?: string[] | null } };

/** the foot line under each At a glance cell; a cell with nothing to say (n = 0) has none */
export function glanceFeet(
  facts: readonly FootFacts[],
  book: readonly string[],
  genreWord: (raw: string) => string,
  gaps: number,
): Record<GlanceKey, GlanceFoot | null> {
  const nq = facts.filter((x) => x.stand === "none");
  const none: GlanceFoot = book.length
    ? { n: nq.filter((x) => takesMain(x.agent.genres ?? [], book)).length, words: "" }
    : { n: nq.filter((x) => (x.agent.genres ?? []).length > 0).length, words: "with genres on file" };
  if (book.length) none.words = `${none.n === 1 ? "wants" : "want"} ${genrePlural(genreWord(book[0]) || book[0])}`;
  const you = facts.filter((x) => x.stand === "you").length;
  const passed = facts.filter((x) => x.stand === "closed" && x.q?.status === QueryStatus.REJECTED).length;
  const keep = (f: GlanceFoot) => (f.n > 0 ? f : null);
  return {
    health: keep({ n: gaps, words: gaps === 1 ? "gap to fill" : "gaps to fill" }),
    none: keep(none),
    querying: keep({ n: you, words: "waiting on you" }),
    closed: keep({ n: passed, words: "passed" }),
  };
}

/* ══ Part C · the List health ring follows the score ═════════════════════════════════════════════════════════════ */

export type HealthTone = "good" | "fair" | "low";
export interface RingColours { arc: string; track: string }

/** 80 and above good · 60–79 fair · under 60 low */
export function healthTone(pct: number): HealthTone {
  return pct >= 80 ? "good" : pct >= 60 ? "fair" : "low";
}

const CREAM_18 = "rgba(244, 238, 229, 0.18)";
export const RING_TONES: Record<HealthTone, { light: RingColours; navy: RingColours }> = {
  good: { light: { arc: "#4e7d60", track: "#d6e4da" }, navy: { arc: "#9fd0ad", track: CREAM_18 } },
  fair: { light: { arc: "#c9765d", track: "#f1d9cf" }, navy: { arc: "#e0a188", track: CREAM_18 } },
  low: { light: { arc: "#a2452a", track: "#efcfc5" }, navy: { arc: "#f0603f", track: CREAM_18 } },
};

/** the ring's arc and track for a score on a background */
export function ringColours(pct: number, on: "light" | "navy"): RingColours {
  return RING_TONES[healthTone(pct)][on];
}
